import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3173);
const testResultsDirectory = fileURLToPath(new URL("./test-results/", import.meta.url));
const chromiumLogFile = fileURLToPath(
  new URL("./test-results/chromium.log", import.meta.url),
);
const browserEnvironment = {
  ...process.env,
  CHROME_LOG_FILE: chromiumLogFile,
};

export default defineConfig({
  globalSetup: "./tests/browser/global-setup.ts",
  outputDir: testResultsDirectory,
  testDir: "./tests/browser",
  timeout: 20_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    launchOptions: {
      args: ["--enable-logging", `--log-file=${chromiumLogFile}`, "--v=1"],
      env: browserEnvironment,
    },
    trace: "retain-on-failure",
  },
});
