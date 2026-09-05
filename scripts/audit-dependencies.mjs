import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Keep the raw audit visible. Permit only the reviewed, parser-disabled finding;
// new advisories, changed versions, or an expired review still fail CI.
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run this check with npm run audit:security.");
const result = spawnSync(process.execPath, [npm, "audit", "--json"], { encoding: "utf8", windowsHide: true });
if (result.error) throw result.error;
const audit = JSON.parse(result.stdout);
if (audit.error || !audit.vulnerabilities) throw new Error(JSON.stringify(audit.error ?? result.stderr));
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const reviewed = new Set([
  "https://github.com/advisories/GHSA-w3rx-r6r6-pgpr",
  "https://github.com/advisories/GHSA-5p2g-fcmc-qvqq",
]);
const exceptionActive = Date.now() < Date.parse("2026-10-05T00:00:00Z")
  && lock.packages["node_modules/image-size"]?.version === "2.0.2"
  && lock.packages["node_modules/vinext"]?.version === "0.0.50";
const unexpected = Object.entries(audit.vulnerabilities).filter(([name, finding]) => {
  if (!exceptionActive) return true;
  if (name === "image-size") return !finding.via.every(entry => typeof entry === "object" && reviewed.has(entry.url));
  if (name === "vinext") return !finding.via.every(entry => entry === "image-size");
  return true;
});
console.log("Raw npm audit:", audit.metadata.vulnerabilities);
if (unexpected.length) {
  console.error("Unreviewed findings:", JSON.stringify(Object.fromEntries(unexpected), null, 2));
  process.exitCode = 1;
} else if (Object.keys(audit.vulnerabilities).length) {
  const mitigation = spawnSync(process.execPath, ["--test", "tests/image-size-policy.test.mjs"], { stdio: "inherit", windowsHide: true });
  if (mitigation.status !== 0) process.exitCode = 1;
  else console.log("Known image-size 2.0.2 findings remain; affected build-time parsers are disabled. Review expires 2026-10-05. See docs/REVIEW-2026-09.md.");
}
