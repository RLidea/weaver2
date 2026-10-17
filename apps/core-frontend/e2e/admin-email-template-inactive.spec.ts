import { test, expect, type Page } from '@playwright/test';

/**
 * 관리자 이메일 템플릿 — 끈 템플릿도 목록에 남아 다시 켤 수 있다.
 *
 * 목록이 켜진 템플릿만 받아 오던 때에는, 한 번 끈 템플릿이 목록에서 사라져
 * 화면에서 다시 켤 길이 없었다. 끄고 → 새로 고쳐도 「비활성」으로 남는지, 그리고
 * 다시 켤 수 있는지 잰다. 시험이 중간에 실패해도 afterEach 가 API 로 다시 켜 둔다.
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

// 화면을 거치지 않고 API 로 켠다 — 시험이 어디서 실패하든 템플릿이 꺼진 채 남지 않게
async function restoreActive(page: Page, name: string) {
  const csrf = await page.request.get('/api/v1/auth/csrf-token');
  const { data: csrfData } = (await csrf.json()) as { data: { csrfToken: string } };
  const headers = { 'x-csrf-token': csrfData.csrfToken };

  const list = await page.request.get('/api/v1/email/templates?activeOnly=false');
  const { data: templates } = (await list.json()) as { data: { id: string; name: string }[] };
  const template = templates.find((t) => t.name === name);
  if (!template) throw new Error(`템플릿 ${name} 이 없습니다`);

  const res = await page.request.post(`/api/v1/email/templates/${template.id}`, {
    headers,
    data: { isActive: true },
  });
  expect(res.ok()).toBe(true);
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
  const NAME = 'welcome';
  const LABEL = '회원가입 환영';

  test.afterEach(async ({ page }) => {
    await restoreActive(page, NAME);
  });

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
