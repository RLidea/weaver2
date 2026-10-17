import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * 셸 사이드바 — 휴대폰 폭(390px)에서는 서랍으로 접히고, 데스크톱 폭에서는 그대로다.
 *
 * 데스크톱 폭의 고정 사이드바가 그대로 남으면 본문이 화면 절반으로 눌린다.
 * 그래서 좁은 화면에서는 헤더의 메뉴 단추로 서랍(모달 대화상자)을 열고, 이동 · Esc ·
 * 배경 클릭으로 닫는다. 열면 초점이 닫기 단추로 가고, 닫으면 메뉴 단추로 돌아오며,
 * 열린 동안 Tab 이 뒤 본문에 닿지 않는다.
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

// 열고 닫을 때 이름이 「열기 · 닫기」로 바뀌므로 aria-controls 로 찾는다
function trigger(page: Page, sidebarId: string): Locator {
  return page.locator(`header button[aria-controls="${sidebarId}"]:visible`);
}

async function expectTabStaysOutOfMain(page: Page) {
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    const inMain = await page.evaluate(() => !!document.activeElement?.closest('main'));
    expect(inMain).toBe(false);
  }
}

test.describe('Admin shell — mobile drawer (390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
  });

  test('메뉴 단추로 서랍을 열고, 메뉴를 고르면 이동한 뒤 서랍이 닫힌다', async ({ page }) => {
    const menuButton = trigger(page, 'admin-sidebar');
    const nav = page.getByRole('navigation', { name: '관리자 메뉴' });

    // 처음에는 닫혀 있다 — 본문을 가리지 않는다
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(menuButton).toHaveAccessibleName('관리자 메뉴 열기');
    await expect(nav).toBeHidden();

    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await expect(menuButton).toHaveAccessibleName('관리자 메뉴 닫기');
    await expect(page.getByRole('dialog', { name: '관리자 메뉴' })).toBeVisible();
    await expect(nav).toBeVisible();

    await nav.getByRole('link', { name: '사용자 관리' }).click();

    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();
    await expect(menuButton).toBeFocused();
  });

  test('열면 닫기 단추에 초점, Tab 은 본문에 닿지 않고, Esc 로 닫으면 메뉴 단추로 돌아온다', async ({
    page,
  }) => {
    const menuButton = trigger(page, 'admin-sidebar');
    const dialog = page.getByRole('dialog', { name: '관리자 메뉴' });

    await menuButton.click();
    await expect(dialog.getByRole('button', { name: '닫기' })).toBeFocused();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    await expectTabStaysOutOfMain(page);

    await page.keyboard.press('Escape');
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(dialog).toBeHidden();
    await expect(menuButton).toBeFocused();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });

  test('배경을 누르면 서랍이 닫힌다', async ({ page }) => {
    const menuButton = trigger(page, 'admin-sidebar');
    const nav = page.getByRole('navigation', { name: '관리자 메뉴' });

    await menuButton.click();
    await expect(nav).toBeVisible();

    // 서랍(240px) 바깥, 헤더 아래를 누른다
    await page.mouse.click(350, 400);
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();
    await expect(menuButton).toBeFocused();
  });
});

test.describe('User app shell — mobile drawer (390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('처음엔 닫혀 있고, 열어서 메뉴를 고르면 이동한 뒤 닫힌다', async ({ page }) => {
    await loginAsAdmin(page);

    const menuButton = trigger(page, 'app-sidebar');
    const nav = page.getByRole('navigation', { name: '주요 메뉴' });

    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();

    await menuButton.click();
    const dialog = page.getByRole('dialog', { name: '메뉴' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: '닫기' })).toBeFocused();

    await expectTabStaysOutOfMain(page);

    await nav.getByRole('link', { name: '알림' }).click();

    await expect(page).toHaveURL(/\/notifications$/);
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();
    await expect(menuButton).toBeFocused();
  });
});

test.describe('Shell sidebars — desktop (1280px)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('관리자: 사이드바가 그대로 보이고 모바일 메뉴 단추는 없다', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');

    await expect(page.getByRole('navigation', { name: '관리자 메뉴' })).toBeVisible();
    await expect(page.getByRole('button', { name: '관리자 메뉴 열기' })).toBeHidden();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('사용자 앱: 사이드바가 보이고, 접은 상태가 새로 고쳐도 남는다', async ({ page }) => {
    await loginAsAdmin(page);

    const nav = page.getByRole('navigation', { name: '주요 메뉴' });
    const collapse = page.getByRole('button', { name: '사이드바 토글' });

    await expect(nav).toBeVisible();
    await expect(page.getByRole('button', { name: '메뉴 열기' })).toBeHidden();
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');

    await collapse.click();
    await expect(collapse).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(() => localStorage.getItem('sidebar-open'))).toBe('false');

    await page.reload();
    await expect(nav).toBeVisible();
    await expect(collapse).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('complementary')).toHaveCSS('width', '64px');
  });
});
