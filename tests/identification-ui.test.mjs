import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workspaceUrl = new URL("../app/ui/IdentificationWorkspace.tsx", import.meta.url);
const catalogUrl = new URL("../app/ui/CatalogBrowser.tsx", import.meta.url);
const resultUrl = new URL("../app/ui/AnalysisResults.tsx", import.meta.url);
const workspaceCssUrl = new URL("../app/ui/identification-workspace.css", import.meta.url);

test("identification workspace exposes both input modes and accessible progress", async () => {
  const source = await readFile(workspaceUrl, "utf8");
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /截图识别/);
  assert.match(source, /网页识别/);
  assert.match(source, /type="file"/);
  assert.match(source, /onDrop=/);
  assert.match(source, /addEventListener\("paste"/);
  assert.match(source, /validateScreenshotDataUrl\(await readFileDataUrl\(file\)\)/);
  assert.match(source, /AbortController/);
  assert.match(source, /role="status"/);
  assert.match(source, /role="alert"/);
});

test("BYOK stays ephemeral and requests are cancellable", async () => {
  const source = await readFile(workspaceUrl, "utf8");
  assert.match(source, /type="password"/);
  assert.match(source, /x-openai-api-key/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/i);
  assert.match(source, /abortRef\.current\?\.abort\(\)/);
});

test("homepage makes identification primary while preserving catalog search", async () => {
  const source = await readFile(catalogUrl, "utf8");
  assert.match(source, /<IdentificationWorkspace/);
  assert.match(source, /id="identify"/);
  assert.match(source, /id="catalog"/);
  assert.match(source, /id="component-search"/);
  assert.match(source, /<GitHubLink/);
});

test("results contain evidence, uncertainty, implementation, code, and feedback", async () => {
  const source = await readFile(resultUrl, "utf8");
  assert.match(source, /candidate\.evidence/);
  assert.match(source, /result\.uncertainties/);
  assert.match(source, /result\.implementation/);
  assert.match(source, /<CodeExplorer/);
  assert.match(source, /判断准确/);
  assert.match(source, /都不是/);
});

test("region overlay follows the rendered image instead of container letterboxing", async () => {
  const css = await readFile(workspaceCssUrl, "utf8");
  const stage = css.slice(
    css.indexOf(".analyzer-image-stage {"),
    css.indexOf(".analyzer-image-stage img"),
  );
  assert.match(stage, /width:\s*fit-content/);
  assert.match(stage, /max-width:\s*100%/);
  assert.doesNotMatch(stage, /min-width:\s*100%/);
});
