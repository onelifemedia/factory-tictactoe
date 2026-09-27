import { defineConfig, devices } from "@playwright/test";

// F-013 (R-014): the post-deploy smoke test, run against the live site
// (SMOKE_URL) by deploy.yml, or against a local server by the harness test.
export default defineConfig({
  testDir: "tests/smoke",
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env["SMOKE_URL"] ?? "http://localhost:4173",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
