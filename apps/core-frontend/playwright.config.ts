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
            // `/v1/health`(전체) 를 기다리지 않는다 — 거기에는 RSS 150MB 임계가 걸려
            // 있고, CI 러너의 Node+Nest 는 그 값을 정상적으로 넘긴다. 그러면 서버가
            // 멀쩡히 떠 있는데도 503 이 돌아와 120초 뒤 "기동 실패" 로 끝난다.
            // 기다려야 하는 것은 **요청을 받을 수 있는가**(DB 연결)이지 메모리 사용량이 아니다.
            url: 'http://localhost:4000/v1/health/ready',
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
            // CI 쪽과 같은 이유 — 기동을 기다리는 프로브는 readiness 를 묻는다.
            url: 'http://localhost:4000/v1/health/ready',
            cwd: '../..',
            reuseExistingServer: true,
            timeout: 120_000,
          },
        ],
});
