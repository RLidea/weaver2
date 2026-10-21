import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';
import { fakeSubFor } from '../../core-backend/test/helpers/fake-oidc-issuer';

/**
 * AUTH_MODE=sso 로그인 — Playwright `sso` 프로젝트만 잡는다(`chromium` 은 *sso*.spec.ts 를 거른다).
 *
 * 백엔드는 sso 로, 가짜 발급자(scripts/fake-oidc-issuer.ts)와 함께 떠 있어야 한다:
 *   pnpm lane:e2e <레인> --sso      (켜고 · 재고 · 내린다)
 * CI 는 ci.yml 의 「E2E (SSO)」 단계가 같은 빌드로 백엔드만 sso 로 다시 켠다.
 *
 * 시드의 관리자(admin@weaver.com)는 이메일로 저절로 잇지 않으므로(sso_conflict) 먼저 운영자 손
 * `pnpm sso:link` 로 가짜 발급자의 sub 에 잇는다 — 그 CLI 의 끝까지 시험이기도 하다.
 */

const ADMIN_EMAIL = 'admin@weaver.com';
const REPO_ROOT = resolve(__dirname, '../../..');

/**
 * 가짜 발급자 주소 — CI 는 ACCOUNTS_OIDC_ISSUER 를 env 로 준다. lane:e2e 는 백엔드에만 주므로
 * 백엔드 포트에서 같은 셈(4280 + (API 포트 − 4000))으로 뽑는다
 */
function fakeIssuer(): string {
  if (process.env.ACCOUNTS_OIDC_ISSUER) return process.env.ACCOUNTS_OIDC_ISSUER;
  const apiPort = Number(new URL(process.env.E2E_API_URL ?? 'http://localhost:4000').port || 80);
  return `http://127.0.0.1:${4280 + apiPort - 4000}/oidc`;
}

async function ssoLogin(page: import('@playwright/test').Page, email: string) {
  await page.getByRole('button', { name: 'SSO 로 로그인' }).click();
  // 가짜 발급자의 로그인 화면
  await expect(page.getByRole('heading', { name: '가짜 계정 서버' })).toBeVisible();
  await page.getByLabel('이메일').fill(email);
  await page.getByRole('button', { name: '로그인' }).click();
}

test.describe('SSO 로그인', () => {
  test.beforeAll(() => {
    // 멱등 — 이미 이어져 있으면 아무것도 하지 않는다
    execFileSync(
      'pnpm',
      ['-s', 'sso:link', '--email', ADMIN_EMAIL, '--sub', fakeSubFor(ADMIN_EMAIL), '--apply'],
      { cwd: REPO_ROOT, stdio: 'pipe', timeout: 120_000 },
    );
  });

  test('로그인 화면은 단추 하나 — 비밀번호 칸이 없다', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'SSO 로 로그인' })).toBeVisible();
    await expect(page.getByLabel('비밀번호')).toHaveCount(0);
  });

  test('/login?redirect=/admin → 발급자 → /admin, 로그아웃 → 발급자 end_session → /', async ({
    page,
    context,
  }) => {
    await page.goto('/login?redirect=/admin');
    await ssoLogin(page, ADMIN_EMAIL);
    await expect(page).toHaveURL(/\/admin$/);

    await page.locator('header button[aria-haspopup="menu"]').click();
    await page.getByRole('menuitem', { name: '로그아웃' }).click();

    // 이 앱의 세션은 먼저 지워지고, 발급자를 거쳐 첫 화면으로 돌아온다
    await expect(page).toHaveURL(/\/\?state=[^&]+$/);
    expect((await context.cookies()).some((c) => c.name === 'refresh_token')).toBe(false);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin$/);
  });

  test('발급자가 back-channel 로그아웃을 보내면 이 세션은 더 갱신되지 않는다', async ({
    page,
    request,
  }) => {
    const email = `sso-bcl-${Date.now()}@example.com`;
    await page.goto('/login?redirect=/settings/security');
    await ssoLogin(page, email);
    await expect(page).toHaveURL(/\/settings\/security$/);

    // 브라우저의 쿠키로 refresh — CSRF 토큰은 refresh 쿠키에 묶이므로 먼저 받는다
    const refresh = async () => {
      const csrf = await page.request.get('/api/v1/auth/csrf-token');
      const token = ((await csrf.json()) as { data: { csrfToken: string } }).data.csrfToken;
      const res = await page.request.post('/api/v1/auth/refresh', {
        headers: { 'x-csrf-token': token },
      });
      return res.status();
    };
    // 한 번 돌려 둔다 — 회전한 새 세션도 sid 를 이어받아야 아래에서 지워진다
    expect(await refresh()).toBe(201);

    // 가짜 발급자가 진짜처럼 서명한 logout_token 을 백엔드에 서버로 보낸다(쿠키 · CSRF 없음)
    const emitted = await request.post(`${fakeIssuer()}/test/backchannel-logout`, {
      form: { email },
    });
    expect(await emitted.json()).toEqual({ status: 200 });

    expect(await refresh()).toBe(401);
  });

  test('새 사람은 계정이 생기고, 보안 설정에는 비밀번호 · 2FA 칸이 없다', async ({ page }) => {
    await page.goto('/login?redirect=/settings/security');
    await ssoLogin(page, `sso-e2e-${Date.now()}@example.com`);
    await expect(page).toHaveURL(/\/settings\/security$/);
    await expect(page.getByRole('heading', { name: '계정 보안' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '비밀번호 변경' })).toHaveCount(0);
  });

  test('같은 이메일의 기존 행(잇지 않은 시드 사람)이면 잇지 않고 sso_conflict 안내', async ({
    page,
  }) => {
    await page.goto('/login');
    await ssoLogin(page, 'moderator@weaver.com');
    await expect(page).toHaveURL(/\/login\?error=sso_conflict$/);
    // Next 의 route announcer 도 alert 라 문구로 고른다
    await expect(
      page.getByRole('alert').filter({ hasText: '운영자에게 연결을 요청' }),
    ).toBeVisible();
  });

  test('발급자가 이메일을 인증하지 않은 새 사람은 sso_email_unverified 안내', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'SSO 로 로그인' }).click();
    await page.getByLabel('이메일').fill(`sso-unverified-${Date.now()}@example.com`);
    await page.getByLabel('email_verified 끄기').check();
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page).toHaveURL(/\/login\?error=sso_email_unverified$/);
    await expect(page.getByRole('alert').filter({ hasText: '이메일 인증' })).toBeVisible();
  });

  test('가입 · 비밀번호 찾기 화면은 안내만 보인다', async ({ page }) => {
    for (const path of ['/sign-up', '/forgot-password']) {
      await page.goto(path);
      await expect(page.getByRole('link', { name: '로그인 화면으로' })).toBeVisible();
    }
  });
});
