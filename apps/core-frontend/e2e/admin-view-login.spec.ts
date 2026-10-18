import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, request, type Page } from '@playwright/test';
import { Client } from 'pg';
import { generate } from 'otplib';

/**
 * 관리자 뷰(백엔드가 내주는 정적 /admin/login) 로그인 — 브라우저 → Nest → DB 를 끝까지.
 *
 * Next 를 거치지 않는다. 이 화면은 백엔드 포트에서만 뜨고, 같은 origin 의 /v1/* 를 부른다.
 * 그래서 E2E_BASE_URL 이 아니라 E2E_API_URL(lane:e2e 가 레인 백엔드 주소를 넘긴다)을 본다.
 *
 * 보는 것:
 *   - 정적 ApiClient 가 CSRF 토큰을 실어 보내는가 (안 실으면 sign-in 부터 403)
 *   - 로그인 뒤 실제로 있는 관리자 화면(/admin/security)으로 가는가
 *   - TOTP 를 켠 관리자는 2FA 단계를 거치고, 틀린 코드에 로그인 화면으로 튕기지 않는가
 *   - 「로그인으로 돌아가기」가 pre_auth 쿠키를 지우는가
 *
 * 시드 관리자 admin@weaver.com 의 2FA 를 앞뒤로 SQL 로 지운다 — 격리 레인 DB 에서 돌린다
 * (`pnpm lane:e2e <레인> admin-view-login`). 백엔드에 TOTP_ENCRYPTION_KEY 가 있어야 한다.
 */

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';
const EMAIL = 'admin@weaver.com';
// 관리자 화면 권한(ADMIN.SECURITY)이 없는 시드 사용자 — 권한 없음 안내·이메일 2FA 를 본다
const MEMBER_EMAIL = 'weaver@weaver.com';
const PASSWORD = 'secret!!';
const TOTP_PERIOD_MS = 30_000;

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(
    resolve(__dirname, '../../core-backend/.env'),
    'utf8',
  );
  const line = env.split('\n').find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('DATABASE_URL 을 찾지 못했습니다');
  return line.slice('DATABASE_URL='.length).replace(/^"|"$/g, '').trim();
}

async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({ connectionString: databaseUrl() });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

async function resetTwoFactor() {
  await withDb(async (db) => {
    for (const email of [EMAIL, MEMBER_EMAIL]) {
      await db.query(
        `DELETE FROM two_factor_methods WHERE "userId" = (SELECT id FROM users WHERE email = $1)`,
        [email],
      );
      await db.query(
        `DELETE FROM auth_lockouts WHERE "userId" = (SELECT id FROM users WHERE email = $1)`,
        [email],
      );
      // 살아 있는 메일 코드가 있으면 재발급 유예(60초)에 걸린다 — 판을 거듭 돌릴 때
      await db.query(
        `DELETE FROM one_time_codes WHERE "userId" = (SELECT id FROM users WHERE email = $1)`,
        [email],
      );
    }
  });
}

/** 이메일 2FA 만 켠다 — 이메일 수단은 비밀이 없어 확인된 행 하나면 된다 */
async function enableEmailTwoFactor(email: string) {
  await withDb((db) =>
    db.query(
      `INSERT INTO two_factor_methods (id, "userId", kind, "confirmedAt")
       SELECT gen_random_uuid()::text, id, 'EMAIL', now() FROM users WHERE email = $1`,
      [email],
    ),
  );
}

/** 화면을 거치지 않고 API 로 TOTP 를 켠다 — 등록 화면은 이 시험이 보는 것이 아니다 */
async function enableTotp(): Promise<string> {
  const api = await request.newContext({ baseURL: API_URL });
  // CSRF 토큰은 refresh_token 쿠키에 묶인다 — 로그인 뒤에 다시 받는다
  const csrfHeaders = async () => {
    const res = await api.get('/v1/auth/csrf-token');
    const { csrfToken } = (
      (await res.json()) as { data: { csrfToken: string } }
    ).data;
    return { 'x-csrf-token': csrfToken };
  };
  try {
    const signIn = await api.post('/v1/auth/sign-in', {
      headers: await csrfHeaders(),
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(signIn.ok()).toBeTruthy();

    const headers = await csrfHeaders();
    const setup = await api.post('/v1/auth/2fa/totp/setup', { headers });
    expect(setup.ok()).toBeTruthy();
    const { secret } = ((await setup.json()) as { data: { secret: string } })
      .data;

    const confirm = await api.post('/v1/auth/2fa/totp/confirm', {
      headers,
      data: { code: await generate({ secret }) },
    });
    expect(confirm.ok()).toBeTruthy();
    return secret;
  } finally {
    await api.dispose();
  }
}

/** 지금 시간 단위가 끝날 때까지 — 등록 확인에 쓴 단위의 코드는 다시 쓸 수 없다 */
async function waitForNextTimeStep(page: Page) {
  const remaining = TOTP_PERIOD_MS - (Date.now() % TOTP_PERIOD_MS);
  await page.waitForTimeout(remaining + 1_000);
}

async function submitPassword(page: Page, email = EMAIL) {
  await page.goto(`${API_URL}/admin/login`);
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function cookieNames(page: Page) {
  return (await page.context().cookies(API_URL)).map((c) => c.name);
}

test.describe('Admin view login', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeAll(resetTwoFactor);
  test.afterAll(resetTwoFactor);

  test('2FA 가 없는 관리자는 비밀번호만으로 관리자 화면에 들어간다', async ({
    page,
  }) => {
    await submitPassword(page);
    await page.waitForURL(`${API_URL}/admin/security`);
    expect(await cookieNames(page)).toContain('access_token');

    // 로그아웃도 CSRF 토큰을 실어야 한다
    await page.getByRole('link', { name: 'Logout' }).click();
    await page.waitForURL(`${API_URL}/admin/login`);
    expect(await cookieNames(page)).not.toContain('access_token');
  });

  test('TOTP 를 켠 관리자는 2FA 단계를 거친다 — 틀린 코드엔 머물고, 맞는 코드로 들어간다', async ({
    page,
  }) => {
    const secret = await enableTotp();
    await waitForNextTimeStep(page);

    await submitPassword(page);
    await expect(
      page.getByRole('heading', { name: 'Two-Step Verification' }),
    ).toBeVisible();
    expect(await cookieNames(page)).toContain('pre_auth');
    expect(await cookieNames(page)).not.toContain('access_token');
    await page.screenshot({
      path: test.info().outputPath('1-two-factor-step.png'),
      fullPage: true,
    });

    // 틀린 코드(401) — 정적 ApiClient 가 토큰 갱신을 시도해 로그인 화면으로 튕기면 안 된다
    await page.getByLabel('Verification Code').fill('000000');
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page.getByText(/Invalid TOTP code/)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Two-Step Verification' }),
    ).toBeVisible();
    expect(await cookieNames(page)).toContain('pre_auth');

    await page.getByLabel('Verification Code').fill(await generate({ secret }));
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.waitForURL(`${API_URL}/admin/security`);
    const after = await cookieNames(page);
    expect(after).toContain('access_token');
    expect(after).not.toContain('pre_auth');
  });

  test('2FA 단계에서 「로그인으로 돌아가기」를 누르면 pre_auth 가 지워지고 비밀번호 화면으로 돌아간다', async ({
    page,
  }) => {
    // 앞 시험이 켠 TOTP 가 남아 있다 (serial)
    await submitPassword(page);
    await expect(
      page.getByRole('heading', { name: 'Two-Step Verification' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Back to sign in' }).click();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Two-Step Verification' }),
    ).toBeHidden();
    expect(await cookieNames(page)).not.toContain('pre_auth');
  });
});

test.describe('Admin view — 권한 없는 계정과 이메일 2FA', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeAll(resetTwoFactor);
  test.afterAll(resetTwoFactor);

  test('ADMIN.SECURITY 가 없는 계정은 403 대신 권한 없음 안내를 보고, 로그아웃해 로그인 화면으로 돌아간다', async ({
    page,
  }) => {
    await submitPassword(page, MEMBER_EMAIL);
    await page.waitForURL(`${API_URL}/admin/security`);
    await expect(
      page.getByRole('heading', { name: 'No Access' }),
    ).toBeVisible();

    // 로그인 화면은 refresh 쿠키가 있으면 곧장 /admin/security 로 보낸다 — 로그아웃이 출구다
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL(`${API_URL}/admin/login`);
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    expect(await cookieNames(page)).not.toContain('refresh_token');
  });

  test('이메일 2FA 만 있으면 단계에 들어갈 때 코드를 한 번 보내고, 다시 보내기의 거절을 그대로 보인다', async ({
    page,
  }) => {
    await enableEmailTwoFactor(MEMBER_EMAIL);

    // 메일을 실제로 내보내지 않는다 — 레인 .env 는 진짜 SMTP 를 쓴다. 발송 경로 자체는
    // 통합 시험(two-factor-login)이 메일을 가로채 본다. 여기서는 화면의 부르는 방식만 본다.
    let sends = 0;
    await page.route('**/v1/auth/2fa/email/send', (route) => {
      sends += 1;
      return sends === 1
        ? route.fulfill({
            status: 201,
            json: { message: 'Verification code sent' },
          })
        : route.fulfill({
            status: 400,
            json: {
              success: false,
              error: { message: 'Please wait before requesting a new code.' },
            },
          });
    });

    await submitPassword(page, MEMBER_EMAIL);
    await expect(
      page.getByRole('heading', { name: 'Two-Step Verification' }),
    ).toBeVisible();
    await expect(page.getByText(/code was sent to your email/)).toBeVisible();
    expect(sends).toBe(1);

    await page.getByRole('button', { name: 'Resend code' }).click();
    await expect(
      page.getByText('Please wait before requesting a new code.'),
    ).toBeVisible();
    expect(sends).toBe(2);
    // 다시 보내기가 거절돼도 앞서 보낸 코드는 살아 있다 — 안내가 「실패」로 바뀌지 않는다
    await expect(page.getByText(/code was sent to your email/)).toBeVisible();
  });
});

test.describe('Admin view — 비밀번호 재설정 화면', () => {
  test('재설정 요청이 CSRF 에 막히지 않고 백엔드에 닿는다', async ({
    page,
  }) => {
    await page.goto(`${API_URL}/admin/request-password-reset`);
    const reply = page.waitForResponse((res) =>
      res.url().endsWith('/v1/auth/password/request-reset'),
    );
    // 없는 주소 — 백엔드는 열거를 막으려 똑같이 200 을 주고 메일은 보내지 않는다
    await page
      .getByLabel('Email Address')
      .fill('nobody@admin-view-e2e.invalid');
    await page.getByRole('button', { name: 'Send Reset Link' }).click();
    // 화면은 열거를 막으려고 늘 성공을 보인다 — 그래서 응답을 직접 본다
    expect((await reply).ok()).toBeTruthy();
  });

  test('엉터리 토큰으로 재설정하면 CSRF 오류가 아니라 「토큰 무효」를 받는다', async ({
    page,
  }) => {
    await page.goto(`${API_URL}/admin/reset-password?token=not-a-real-token`);
    await page.getByLabel('New Password').fill('NewPass1234!');
    await page.getByLabel('Confirm Password').fill('NewPass1234!');
    await page.getByRole('button', { name: 'Change Password' }).click();
    await expect(
      page.getByText(/Invalid or expired password reset token/),
    ).toBeVisible();
  });
});
