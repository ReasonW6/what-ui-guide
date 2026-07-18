import { spawn } from "node:child_process";
import { once } from "node:events";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const testsDirectory = resolve(root, "tests");
const productionOnlyTests = new Set([
  "identify-route.test.mjs",
  "rendered-html.test.mjs",
]);

async function discoverUnitTests(directory) {
  const tests = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      tests.push(...await discoverUnitTests(path));
    } else if (entry.name.endsWith(".test.mjs") && !productionOnlyTests.has(entry.name)) {
      tests.push(path);
    }
  }
  return tests.sort();
}

const tests = await discoverUnitTests(testsDirectory);
if (tests.length === 0) throw new Error("No unit tests were discovered.");

const child = spawn(process.execPath, ["--test", ...tests], {
  cwd: root,
  stdio: "inherit",
  windowsHide: true,
});
const [code, signal] = await once(child, "exit");
if (code !== 0) {
  throw new Error(`Unit tests failed (${code ?? signal}).`);
}
