import { test, expect, type Page } from '@playwright/test';

/**
 * 관리자 이메일 템플릿 — 끈 템플릿도 목록에 남아 다시 켤 수 있다.
 *
 * 목록이 켜진 템플릿만 받아 오던 때에는, 한 번 끈 템플릿이 목록에서 사라져
 * 화면에서 다시 켤 길이 없었다. 끄고 → 새로 고쳐도 「비활성」으로 남는지, 그리고
 * 다시 켤 수 있는지 잰다. 시험이 끝나면 처음처럼 켜 둔다.
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

async function setActive(page: Page, label: string, active: boolean) {
  await page.getByRole('button', { name: new RegExp(label) }).click();
  const toggle = page.getByRole('switch');
  if ((await toggle.getAttribute('aria-checked')) !== String(active)) {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute('aria-checked', String(active));
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.getByRole('button', { name: '저장' })).toBeHidden();
}

test.describe('Admin email templates — inactive templates stay listed', () => {
  const LABEL = '회원가입 환영';

  test('끈 템플릿이 새로 고친 뒤에도 「비활성」으로 남고, 다시 켤 수 있다', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/email-templates');

    const card = page.getByRole('button', { name: new RegExp(LABEL) });
    await expect(card).toBeVisible();

    await setActive(page, LABEL, false);

    await page.reload();
    await expect(card).toBeVisible();
    await expect(card).toContainText('비활성');

    await setActive(page, LABEL, true);

    await page.reload();
    await expect(card).toContainText('활성');
    await expect(card).not.toContainText('비활성');
  });
});
