import { defineConfig } from "@playwright/test";

// Run via `npm run test:e2e` (scripts/e2e.sh seeds + builds against the dedicated test database first).
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  workers: 1,
  use: { baseURL: "http://localhost:3101", trace: "retain-on-failure" },
  webServer: {
    command: "npx next start -p 3101",
    url: "http://localhost:3101",
    reuseExistingServer: false,
    env: { DATABASE_URL: process.env.DATABASE_URL ?? "", AUTH_SECRET: process.env.AUTH_SECRET ?? "" },
  },
});
