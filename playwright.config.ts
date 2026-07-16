import { defineConfig } from "@playwright/test";

const port = 4173;

export default defineConfig({
  globalSetup: "./tests/browser/global-setup.ts",
  testDir: "./tests/browser",
  timeout: 20_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
});
