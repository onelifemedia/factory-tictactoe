import { defineConfig, devices } from "@playwright/test";

const previewPort = 4173;
const isContinuousIntegration = Boolean(process.env["CI"]);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: isContinuousIntegration,
  retries: isContinuousIntegration ? 1 : 0,
  reporter: isContinuousIntegration
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: `http://localhost:${String(previewPort)}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run build && npm run preview -- --port ${String(previewPort)} --strictPort`,
    url: `http://localhost:${String(previewPort)}`,
    reuseExistingServer: !isContinuousIntegration,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-android", use: { ...devices["Pixel 7"] } },
    { name: "mobile-iphone", use: { ...devices["iPhone 14"] } },
  ],
});
