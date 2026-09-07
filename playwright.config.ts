import { defineConfig, devices } from '@playwright/test';

/**
 * One smoke test, so one browser and no sharding.
 *
 * The server under test is the production build, not `next dev`: the replay is
 * the one thing on the site whose behaviour depends on prerendering and
 * streaming, and dev mode compiles routes on demand — a timing assertion there
 * measures the compiler. `E2E_BASE_URL` points the same test at a deployed URL
 * instead, which is how it runs against a preview.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Building here rather than in a separate step keeps `pnpm e2e` one
        // command locally and one step in CI.
        command: 'pnpm build && pnpm start',
        url: 'http://localhost:3000',
        timeout: 300_000,
        reuseExistingServer: !process.env.CI,
      },
});
