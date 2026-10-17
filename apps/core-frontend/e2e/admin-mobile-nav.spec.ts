import { test, expect, type Page } from '@playwright/test';

/**
 * 관리자 화면 — 휴대폰 폭(390px)에서는 사이드바가 서랍으로 접힌다.
 *
 * 데스크톱 폭의 고정 사이드바가 그대로 남으면 본문이 화면 절반으로 눌린다.
 * 그래서 좁은 화면에서는 헤더의 메뉴 단추로 서랍을 열고, 이동 · Esc · 배경 클릭으로 닫는다.
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

test.describe('Admin shell — mobile drawer', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
  });

  test('메뉴 단추로 서랍을 열고, 메뉴를 고르면 이동한 뒤 서랍이 닫힌다', async ({ page }) => {
    const menuButton = page.getByRole('button', { name: '관리자 메뉴 열기' });
    const nav = page.getByRole('navigation', { name: '관리자 메뉴' });

    // 처음에는 닫혀 있다 — 본문을 가리지 않는다
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();

    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await expect(nav).toBeVisible();

    await nav.getByRole('link', { name: '사용자 관리' }).click();

    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();
  });

  test('Esc 로 서랍이 닫힌다', async ({ page }) => {
    const menuButton = page.getByRole('button', { name: '관리자 메뉴 열기' });
    const nav = page.getByRole('navigation', { name: '관리자 메뉴' });

    await menuButton.click();
    await expect(nav).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();
  });

  test('배경을 누르면 서랍이 닫힌다', async ({ page }) => {
    const menuButton = page.getByRole('button', { name: '관리자 메뉴 열기' });
    const nav = page.getByRole('navigation', { name: '관리자 메뉴' });

    await menuButton.click();
    await expect(nav).toBeVisible();

    // 서랍(240px) 바깥, 헤더 아래를 누른다
    await page.mouse.click(350, 400);
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();
  });
});
