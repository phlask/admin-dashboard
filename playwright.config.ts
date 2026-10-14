import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. They run the production build against an in-memory mock
 * of Supabase (e2e/mock-supabase.mjs), so no credentials or network access
 * are needed. The mock is shared state, so tests run serially and each one
 * resets it first (see e2e/fixtures.ts).
 */
const MOCK_PORT = 54400;
const APP_PORT = 5180;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node e2e/mock-supabase.mjs",
      url: `http://127.0.0.1:${MOCK_PORT}/__log`,
      env: { MOCK_SUPABASE_PORT: String(MOCK_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm build && pnpm start",
      url: `http://localhost:${APP_PORT}/auth`,
      env: {
        PORT: String(APP_PORT),
        SUPABASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
        SUPABASE_PUBLISHABLE_KEY: "e2e-mock-key",
      },
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
