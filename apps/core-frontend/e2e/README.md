# weaver2 e2e tests (Playwright)

End-to-end browser tests that exercise the **full stack** — Next.js frontend (`:3000`) talking to the NestJS backend (`:4000`) over HTTP, hitting a real PostgreSQL database via Prisma.

## Prerequisites

- A PostgreSQL instance reachable via `apps/core-backend/.env` `DATABASE_URL`
- Migrations applied: `pnpm db:migrate`
- Seed data applied: `pnpm db:seed`
- Browsers installed (one-time): `pnpm --filter core-frontend exec playwright install chromium`

## Running

From the repository root:

```bash
# Default — Playwright auto-starts both frontend and backend dev servers
pnpm --filter core-frontend e2e

# Interactive UI mode (great for authoring)
pnpm --filter core-frontend e2e:ui

# Headed mode (watch the browser)
pnpm --filter core-frontend e2e --headed
```

If you already have `pnpm dev:core` and `pnpm dev:web` running in separate terminals, skip auto-start:

```bash
E2E_NO_WEBSERVER=1 pnpm --filter core-frontend e2e
```

## Conventions

- Use `data-testid` attributes for stable selectors. Avoid CSS class selectors (skin tokens change).
- Each test must be self-contained: create the data it needs, assume nothing about prior state.
- Use unique test users per scenario (e.g. `e2e-${Date.now()}@example.com`) to avoid cross-test interference.
- Keep tests serial — a single worker hits a shared DB. `fullyParallel: false` is intentional.

## Reports

- HTML report: `apps/core-frontend/playwright-report/` (auto-opens on failure when run with `--reporter=html`)
- Traces / screenshots / videos: `apps/core-frontend/test-results/`

## When tests get flaky

1. Increase `timeout` for the specific assertion (`expect(...).toHaveText(..., { timeout: 10_000 })`)
2. Run with `--trace on` and inspect the trace viewer
3. If the flake is environmental (race with backend boot), bump `webServer.timeout` in `playwright.config.ts`
