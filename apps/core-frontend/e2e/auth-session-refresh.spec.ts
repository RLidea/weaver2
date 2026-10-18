import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * 액세스 토큰이 만료된 탭 — 새로고침 없이 화면 안에서 움직일 때.
 *
 * 서버는 CSRF 토큰을 refresh_token 쿠키에 묶는다. 로그인이나 refresh 로 그 쿠키가 바뀐 뒤
 * ApiClient 가 예전 CSRF 를 그대로 쓰면 refresh 가 403 으로 막히고, 403 은 refresh 핸들러에
 * 닿지 않아 쿠키도 남는다 — 화면은 /login ↔ /dashboard 사이에서 스피너로 멈췄다.
 * 새로고침하면 CSRF 를 새로 받아 멀쩡해지므로, 여기서는 **페이지를 다시 읽지 않고** 링크로 움직인다.
 *
 * 시드 관리자(admin@weaver.com)를 쓴다 — auth-login.spec.ts 와 같은 계정이다.
 */

const ADMIN_EMAIL = 'admin@weaver.com';
const ADMIN_PASSWORD = 'secret!!';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('이메일').fill(ADMIN_EMAIL);
  await page.getByLabel('비밀번호').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** 액세스 토큰이 만료된 것처럼 — refresh_token 은 그대로 둔다 */
async function expireAccessToken(context: BrowserContext) {
  await context.clearCookies({ name: 'access_token' });
}

/** 마지막 refresh 응답 — CSRF 403 뒤 재시도가 있으면 그 재시도의 것 */
function waitForRefresh(page: Page) {
  return page.waitForResponse(
    (res) => res.url().endsWith('/v1/auth/refresh') && res.status() !== 403,
  );
}

test.describe('세션 — 액세스 토큰 만료 뒤 refresh', () => {
  test('액세스 토큰만 지워도 화면 안 이동이 연달아 동작한다', async ({ page, context }) => {
    await loginAsAdmin(page);

    // 제목은 데이터가 실패해도 그려지므로 refresh 응답 자체를 잰다.
    // 처음 여는 화면으로만 간다 — 캐시에서 나오면 요청이 없어 refresh 도 안 일어난다.

    // 첫 refresh — 로그인 직후라 받아 둔 CSRF 가 로그인 전 것이다
    await expireAccessToken(context);
    const first = waitForRefresh(page);
    await page.locator('header a[href="/notifications"]').click();
    expect((await first).ok()).toBe(true);
    await expect(page.getByRole('heading', { name: '알림', level: 1 })).toBeVisible();

    // 둘째 refresh — 첫 refresh 로 쿠키가 또 바뀌었다
    await expireAccessToken(context);
    const second = waitForRefresh(page);
    await page.locator('header button[aria-haspopup="menu"]').click();
    await page.getByRole('menuitem', { name: '보안 설정' }).click();
    expect((await second).ok()).toBe(true);
    await expect(page).toHaveURL(/\/settings\/security$/);
    await expect(page.getByRole('heading', { name: '비밀번호 변경' })).toBeVisible();
  });

  test('서버가 세션을 거절하면 스피너가 아니라 로그인 화면에 닿는다', async ({
    page,
    context,
  }) => {
    await loginAsAdmin(page);

    // refresh_token 을 서버가 모르는 값으로 바꾼다 — refresh 가 정말 실패해야 하는 경우
    const refresh = (await context.cookies()).find((c) => c.name === 'refresh_token');
    expect(refresh).toBeDefined();
    // domain 을 주면 원래 것(host-only)과 다른 쿠키가 하나 더 생겨 서버가 지워도 남는다 — url 로 넣는다
    await context.clearCookies({ name: 'access_token' });
    await context.clearCookies({ name: 'refresh_token' });
    await context.addCookies([
      {
        name: 'refresh_token',
        value: 'not-a-real-refresh-token',
        url: new URL(page.url()).origin,
        httpOnly: refresh!.httpOnly,
        sameSite: refresh!.sameSite,
      },
    ]);

    await page.locator('header a[href="/notifications"]').click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
    expect((await context.cookies()).some((c) => c.name === 'refresh_token')).toBe(false);
  });
});
