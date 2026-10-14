import { defineConfig } from "@playwright/test";

// Lives in tests/e2e (QA may only write here). Run: npx playwright test -c tests/e2e/playwright.config.ts
export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts/,
  timeout: 30_000,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "https://steady-fitness.vercel.app",
    viewport: { width: 390, height: 844 },
    trace: "off",
  },
});
