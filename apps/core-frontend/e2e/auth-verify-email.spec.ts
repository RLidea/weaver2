import { test, expect } from '@playwright/test';

/**
 * 이메일 인증 화면 — 토큰만으로는 인증되지 않고, 가입 때 정한 비밀번호를 함께 받는다.
 *
 * 선점 가입 탈취(남이 내 이메일로 미리 가입해 둔 계정을 링크 한 번에 인증해 주는 것)를
 * 막기 위한 흐름이다. 실제 인증 토큰은 메일로만 나가고 DB 엔 해시만 남으므로, 여기서는
 * 화면이 비밀번호를 요구하고 서버의 거절을 제대로 보여 주는지까지 잰다.
 * (비밀번호 일치·불일치 판정은 sign-up.service.spec.ts 가 잰다.)
 */
test.describe('Email verification — password required', () => {
  test('인증 링크를 열면 바로 인증하지 않고 비밀번호를 묻는다', async ({ page }) => {
    await page.goto('/auth/verify?token=e2e-not-a-real-token');

    await expect(page.getByRole('heading', { name: '이메일 인증' })).toBeVisible();
    await expect(page.getByLabel('비밀번호')).toBeVisible();
    await expect(page.getByRole('link', { name: '비밀번호 재설정' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  test('유효하지 않은 토큰은 서버가 거절하고 인증 실패를 보여 준다', async ({ page }) => {
    await page.goto('/auth/verify?token=e2e-not-a-real-token');

    await page.getByLabel('비밀번호').fill('whatever-password');
    await page.getByRole('button', { name: '인증하기' }).click();

    await expect(page.getByRole('heading', { name: '인증 실패' })).toBeVisible();
  });

  test('토큰 없는 링크는 바로 인증 실패', async ({ page }) => {
    await page.goto('/auth/verify');

    await expect(page.getByRole('heading', { name: '인증 실패' })).toBeVisible();
  });
});
