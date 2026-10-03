import { defineConfig, devices } from "@playwright/test";

// Two phone profiles stand in for the two store builds: iPhone 15 (iOS layout, WebKit when E2E_WEBKIT=1) and Pixel 7 (Android).
// Chromium drives both by default so CI needs no WebKit download; E2E_CHROMIUM points at a pre-installed browser.
const exe = process.env.E2E_CHROMIUM || undefined;
const webkit = process.env.E2E_WEBKIT === "1";
const chromiumUse = { launchOptions: { executablePath: exe } };
const base = process.env.E2E_BASE || "http://127.0.0.1:5173";
// iPhone 15 under Chromium keeps the viewport, touch and DPR of the phone but not its engine (isMobile / hasTouch are kept).
const iphone = { ...devices["iPhone 15"] }; const { defaultBrowserType: _a, ...iphoneNoEngine } = iphone as any; const { defaultBrowserType: _b, ...pixel } = devices["Pixel 7"] as any;

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts/,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "../playwright-report" }]] : "list",
  outputDir: "../test-results",
  use: { baseURL: base, locale: "ar-EG", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "android", use: { ...pixel, ...chromiumUse } },
    { name: "ios", use: webkit ? { ...devices["iPhone 15"] } : { ...iphoneNoEngine, ...chromiumUse } },
  ],
  webServer: process.env.E2E_BASE ? undefined : { command: "npx vite --port 5173 --strictPort --host 127.0.0.1", url: base, reuseExistingServer: true, timeout: 120_000 },
});
