import { defineConfig, devices } from "@playwright/test";

// F-013 (R-014): the post-deploy smoke test, run against the live site
// (SMOKE_URL) by deploy.yml, or against a local server by the harness test.
// The base URL always ends in "/", so "./" in the spec stays inside the
// project path (GitHub Pages serves this site under /factory-tictactoe/).
const smokeUrl = process.env["SMOKE_URL"] ?? "http://localhost:4173/";
const normalizedBaseUrl = smokeUrl.endsWith("/") ? smokeUrl : `${smokeUrl}/`;

export default defineConfig({
  testDir: "tests/smoke",
  retries: 0,
  reporter: "list",
  use: {
    baseURL: normalizedBaseUrl,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
