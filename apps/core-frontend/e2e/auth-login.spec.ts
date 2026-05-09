import { test, expect } from '@playwright/test';

/**
 * First e2e scenario for weaver2.
 *
 * Exercises the full auth path end-to-end:
 *   browser → Next.js → Next proxy (/api) → NestJS → Prisma → Postgres
 * and back, including ApiClient CSRF handling, backend JWT issuance via
 * HttpOnly cookie, and the frontend AuthProvider unlocking the
 * (protected) route group.
 *
 * Uses the seeded `admin` user — see apps/core-backend/prisma/seed/user.seed.ts.
 * The seeded admin is `isVerified: true` and has no 2FA enabled, so the
 * golden path is a single submit.
 *
 * Prerequisites (see e2e/README.md):
 *   - Database migrated (`pnpm db:migrate`)
 *   - Seeds applied (`pnpm db:seed`)
 */

const ADMIN_EMAIL = 'admin@weaver.com';
const ADMIN_PASSWORD = 'secret!!';

test.describe('Authentication — login (golden path)', () => {
  test('seeded admin logs in with email + password and reaches /dashboard', async ({
    page,
  }) => {
    await page.goto('/login');

    // Login page rendered
    await expect(
      page.getByRole('heading', { name: '로그인' }),
    ).toBeVisible();

    // Fill credentials
    await page.getByLabel('이메일').fill(ADMIN_EMAIL);
    await page.getByLabel('비밀번호').fill(ADMIN_PASSWORD);

    // Submit
    await page.getByRole('button', { name: '로그인' }).click();

    // Successful login redirects to the default protected route
    await expect(page).toHaveURL(/\/dashboard$/);

    // Login form is gone — we're on the dashboard
    await expect(
      page.getByRole('heading', { name: '로그인' }),
    ).not.toBeVisible();
  });
});
