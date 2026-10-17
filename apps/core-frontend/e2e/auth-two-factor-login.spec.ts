import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { Client } from 'pg';
import { generate } from 'otplib';

/**
 * 2단계 인증 로그인 — 브라우저 → Next(/api 프록시) → Nest → DB 를 끝까지.
 *
 * 단위·통합 시험이 못 보는 것을 본다:
 *   - pre_auth 쿠키가 브라우저에서 실제로 오가는가 (Path=/ · Next 의 /api 리라이트를 거쳐)
 *   - 로그인 화면이 2FA 단계로 넘어가고, /login?step=2fa 로 새로 들어와도 이어지는가
 *   - TOTP 등록 화면 → 확인 → 로그인 2FA 까지 한 사람의 흐름이 이어지는가
 *
 * 이메일 2FA 대신 TOTP 를 쓴다 — 시험이 비밀을 알고 코드를 만들 수 있고, 메일이 밖으로
 * 나가지 않는다. 백엔드에 TOTP_ENCRYPTION_KEY 가 있어야 한다(없으면 등록이 500).
 *
 * 시드 계정 weaver@weaver.com 의 2FA 를 앞뒤로 SQL 로 지운다 — 격리 레인 DB 에서 돌린다
 * (`pnpm lane:e2e <레인> auth-two-factor-login`). 공용 DB 에서 돌리면 남의 상태를 건드린다.
 */

const EMAIL = 'weaver@weaver.com';
const PASSWORD = 'secret!!';
const TOTP_PERIOD_MS = 30_000;

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(resolve(__dirname, '../../core-backend/.env'), 'utf8');
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

/** 지금 시간 단위가 끝날 때까지 — 같은 단위의 코드는 다시 쓸 수 없다(재사용 차단) */
async function waitForNextTimeStep(page: Page) {
  const remaining = TOTP_PERIOD_MS - (Date.now() % TOTP_PERIOD_MS);
  await page.waitForTimeout(remaining + 1_000);
}

async function submitPassword(page: Page) {
  await page.goto('/login');
  await page.getByLabel('이메일').fill(EMAIL);
  await page.getByLabel('비밀번호').fill(PASSWORD);
  await page.getByRole('button', { name: '로그인' }).click();
}

test.describe('Two-factor login (TOTP)', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeAll(resetTwoFactor);
  test.afterAll(resetTwoFactor);

  test('TOTP 를 켜면 다음 로그인부터 2FA 화면을 거쳐야 대시보드에 들어간다', async ({
    page,
    context,
  }) => {
    // 1) 2FA 없이 로그인 → 설정에서 TOTP 등록
    await submitPassword(page);
    await page.waitForURL('**/dashboard');

    await page.goto('/settings/security');
    await page.getByRole('button', { name: '설정' }).first().click();
    const secret = (
      await page.getByTestId('totp-secret').textContent()
    )?.trim();
    expect(secret).toBeTruthy();
    await page.screenshot({
      path: test.info().outputPath('1-totp-setup.png'),
      fullPage: true,
    });

    const setupCode = await generate({ secret: secret! });
    await page.getByPlaceholder('6자리 코드 입력').first().fill(setupCode);
    await page.getByRole('button', { name: '확인' }).click();
    await expect(page.getByText('활성').first()).toBeVisible();

    // 2) 로그아웃한 셈 치고 다시 로그인 → 세션 대신 2FA 화면
    await context.clearCookies();
    await submitPassword(page);
    await expect(
      page.getByRole('heading', { name: '2단계 인증' }),
    ).toBeVisible();
    const cookies = await context.cookies();
    expect(cookies.map((c) => c.name)).toContain('pre_auth');
    expect(cookies.map((c) => c.name)).not.toContain('access_token');
    await page.screenshot({
      path: test.info().outputPath('2-two-factor-step.png'),
      fullPage: true,
    });

    // 3) 새로 고쳐 들어와도(OAuth 리다이렉트와 같은 길) pre_auth 쿠키로 이어진다
    await page.goto('/login?step=2fa');
    await expect(
      page.getByRole('heading', { name: '2단계 인증' }),
    ).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath('3-two-factor-step-redirect.png'),
      fullPage: true,
    });

    // 4) 등록 확인에 쓴 바로 그 코드는 로그인에 못 쓴다 — 같은 시간 단위면 재사용 차단에,
    //    지난 단위면 afterTimeStep 에 걸려 어느 쪽이든 거절이다. 2FA 화면에 머문다.
    await page.getByLabel('인증 코드').fill(setupCode);
    await page.getByRole('button', { name: '인증 완료' }).click();
    await expect(page.getByText(/Invalid TOTP code/)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await page.screenshot({
      path: test.info().outputPath('4-setup-code-rejected.png'),
      fullPage: true,
    });

    // 5) 다음 시간 단위의 새 코드로 들어간다
    await waitForNextTimeStep(page);
    await page.getByLabel('인증 코드').clear();
    await page.getByLabel('인증 코드').fill(await generate({ secret: secret! }));
    await page.getByRole('button', { name: '인증 완료' }).click();
    await page.waitForURL('**/dashboard');
    const after = await context.cookies();
    expect(after.map((c) => c.name)).toContain('access_token');
    expect(after.map((c) => c.name)).not.toContain('pre_auth');
    await page.screenshot({
      path: test.info().outputPath('5-dashboard.png'),
      fullPage: true,
    });
  });
});
