import { defineConfig } from "@playwright/test";

// Local UI regression only. No staging credentials or production mutations.
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  timeout: 45_000,
  use: { baseURL: "http://localhost:3001", browserName: "chromium", channel: "msedge", screenshot: "only-on-failure" },
});
