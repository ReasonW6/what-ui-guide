import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3173);

export default defineConfig({
  globalSetup: "./tests/browser/global-setup.ts",
  testDir: "./tests/browser",
  timeout: 20_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
});
