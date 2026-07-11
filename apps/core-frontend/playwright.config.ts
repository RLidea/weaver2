import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

/**
 * Playwright e2e config for weaver2.
 *
 * Spins up both the Next.js frontend (port 3000) and the NestJS backend
 * (port 4000) via webServer entries below. If E2E_NO_WEBSERVER is set,
 * skips the auto-start (useful when both servers are already running
 * in your local dev terminals).
 *
 * Override the frontend base URL with E2E_BASE_URL for non-default ports.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  // Sequential by default — backend uses a single shared DB.
  fullyParallel: false,
  workers: 1,

  forbidOnly: isCI,
  retries: isCI ? 2 : 0,

  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: process.env.E2E_NO_WEBSERVER
    ? undefined
    : isCI
      ? [
          // CI: backend dist + frontend .next must already be built
          // before playwright runs (see .github/workflows/ci.yml e2e job).
          {
            command: 'pnpm prod:core',
            url: 'http://localhost:4000/v1/health',
            cwd: '../..',
            timeout: 120_000,
            // 기동 실패 진단용 — stdout은 기본 무시라 서버가 침묵한 채 죽으면 단서가 없다
            stdout: 'pipe',
          },
          {
            command: 'pnpm --filter core-frontend exec next start -p 3000',
            url: 'http://localhost:3000',
            cwd: '../..',
            timeout: 120_000,
            stdout: 'pipe',
          },
        ]
      : [
          // Local: reuse already-running pnpm dev:web / dev:core if any.
          {
            command: 'pnpm --filter core-frontend dev',
            url: 'http://localhost:3000',
            cwd: '../..',
            reuseExistingServer: true,
            timeout: 120_000,
          },
          {
            command: 'pnpm dev:core',
            url: 'http://localhost:4000/v1/health',
            cwd: '../..',
            reuseExistingServer: true,
            timeout: 120_000,
          },
        ],
});
