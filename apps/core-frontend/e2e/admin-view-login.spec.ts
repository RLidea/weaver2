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

async function resetTwoFactor() {
  const db = new Client({ connectionString: databaseUrl() });
  await db.connect();
  try {
    await db.query(
      `DELETE FROM two_factor_methods WHERE "userId" = (SELECT id FROM users WHERE email = $1)`,
      [EMAIL],
    );
    await db.query(
      `DELETE FROM auth_lockouts WHERE "userId" = (SELECT id FROM users WHERE email = $1)`,
      [EMAIL],
    );
  } finally {
    await db.end();
  }
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

async function submitPassword(page: Page) {
  await page.goto(`${API_URL}/admin/login`);
  await page.getByLabel('Email Address').fill(EMAIL);
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
