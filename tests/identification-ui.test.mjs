import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workspaceUrl = new URL("../app/ui/IdentificationWorkspace.tsx", import.meta.url);
const catalogUrl = new URL("../app/ui/CatalogBrowser.tsx", import.meta.url);
const dialogUrl = new URL("../app/ui/IdentificationDialog.tsx", import.meta.url);
const settingsUrl = new URL("../app/ui/AiProviderSettings.tsx", import.meta.url);
const vaultUrl = new URL("../lib/client/credential-vault.ts", import.meta.url);
const providerConfigUrl = new URL("../lib/ai-provider-config.ts", import.meta.url);
const resultUrl = new URL("../app/ui/AnalysisResults.tsx", import.meta.url);
const regionUrl = new URL("../app/ui/RegionSelector.tsx", import.meta.url);
const contractUrl = new URL("../lib/identification-contract.ts", import.meta.url);
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
  assert.match(source, /await validateScreenshotDataUrl\(await readFileDataUrl\(file\)\)/);
  assert.match(source, /AbortController/);
  assert.match(source, /role="status"/);
  assert.match(source, /role="alert"/);
});

test("BYOK supports session-only use and encrypted browser storage", async () => {
  const [workspace, settings, vault] = await Promise.all([
    readFile(workspaceUrl, "utf8"),
    readFile(settingsUrl, "utf8"),
    readFile(vaultUrl, "utf8"),
  ]);
  assert.match(settings, /type=\{showKey \? "text" : "password"\}/);
  assert.match(workspace, /x-ai-api-key/);
  assert.match(workspace, /action: "prepare-direct"/);
  assert.match(workspace, /action: "finalize-direct"/);
  assert.match(workspace, /fetchBoundedProviderJson/);
  assert.match(workspace, /cropScreenshot\(screenshotUrl, selection\)/);
  assert.doesNotMatch(workspace, /resolvedProvider\.id === "xai" \? "image\/jpeg"/);
  assert.doesNotMatch(`${workspace}\n${settings}`, /localStorage|sessionStorage/i);
  assert.match(vault, /AES-GCM/);
  assert.match(vault, /extractable/);
  assert.match(vault, /indexedDB/);
  assert.match(workspace, /abortRef\.current\?\.abort\(\)/);
});

test("homepage preserves its original layout and opens identification in a dialog", async () => {
  const [source, dialog] = await Promise.all([
    readFile(catalogUrl, "utf8"),
    readFile(dialogUrl, "utf8"),
  ]);
  assert.match(source, /<IdentificationDialog/);
  assert.match(source, /import\("\.\/IdentificationDialog"\)/);
  assert.match(source, /isIdentificationOpen && \(/);
  assert.doesNotMatch(source, /<IdentificationWorkspace|id="identify"/);
  assert.match(source, /aria-haspopup="dialog"/);
  assert.match(source, /aria-controls=\{isIdentificationOpen \? "identification-dialog" : undefined\}/);
  assert.match(source, /id="component-search"/);
  assert.ok(source.indexOf("id=\"component-search\"") < source.indexOf("id=\"terms\""));
  assert.ok(source.indexOf("id=\"terms\"") < source.indexOf("id=\"catalog\""));
  assert.match(source, /找到准确的组件名称/);
  assert.match(source, /<GitHubLink/);
  assert.match(source, /import\("\.\/DemoStage"\)/);
  assert.match(source, /IntersectionObserver/);
  assert.match(source, /data-demo-placeholder=/);
  assert.match(source, /<DeferredCardDemo item=\{item\}/);
  assert.match(dialog, /<dialog/);
  assert.match(dialog, /showModal\(\)/);
  assert.match(dialog, /closeRef\.current\?\.focus\(\)/);
  assert.match(dialog, /triggerRef\.current\?\.focus\(\)/);
  assert.match(dialog, /\{open && \(/);
  assert.match(dialog, /<IdentificationWorkspace/);
});

test("provider settings include mainstream presets and bounded custom endpoints", async () => {
  const [settings, providerConfig] = await Promise.all([
    readFile(settingsUrl, "utf8"),
    readFile(providerConfigUrl, "utf8"),
  ]);
  assert.match(settings, /API 设置/);
  assert.match(settings, /role="listbox"/);
  assert.match(settings, /provider-picker-option/);
  assert.match(settings, /关闭 API 设置/);
  assert.match(settings, /最终请求地址/);
  assert.match(settings, /action: "connect"/);
  assert.match(settings, /providerConnectionEndpoint/);
  assert.match(settings, /fetchBoundedProviderJson/);
  assert.match(settings, /connectionAbortRef\.current\?\.abort/);
  assert.match(settings, /connectionStatus === "testing" \? "取消连接" : "连接"/);
  assert.match(settings, /在此浏览器加密保存/);
  assert.match(settings, /apiKey: ""/);
  assert.match(settings, /OpenAI Chat Completions/);
  for (const provider of [
    "openai",
    "anthropic",
    "kimi",
    "kimi-global",
    "siliconflow",
    "siliconflow-global",
    "openrouter",
    "gemini",
    "xai",
  ]) {
    assert.match(providerConfig, new RegExp(`id: "${provider}"`));
  }
  for (const removedProvider of ["deepseek", "groq", "together", "mistral"]) {
    assert.doesNotMatch(providerConfig, new RegExp(`id: "${removedProvider}"`));
  }
  assert.doesNotMatch(providerConfig, /官方/);
  assert.match(providerConfig, /Only HTTPS|仅支持 HTTPS/);
  assert.match(providerConfig, /provider\.protocol === "anthropic-messages"/);
});

test("API settings remain available after results without expanding the input column", async () => {
  const [workspace, settings] = await Promise.all([
    readFile(workspaceUrl, "utf8"),
    readFile(settingsUrl, "utf8"),
  ]);
  assert.doesNotMatch(workspace, /analyzer-intro/);
  assert.match(workspace, /providerSettingsOpen && capabilities/);
  assert.match(workspace, /: !result \? \(/);
  assert.doesNotMatch(workspace, /!result && \(providerSettingsOpen/);
  assert.match(workspace, /<AiProviderSettingsPanel/);
  assert.match(workspace, /<AiProviderSettingsSummary/);
  assert.match(settings, /onOpenChange\(!open\)/);
  assert.match(settings, /provider-settings-toggle/);
  assert.match(settings, /providerTriggerRef\.current\?\.focus\(\)/);
});

test("source revisions prevent stale analyses and candidate implementations are guarded", async () => {
  const source = await readFile(workspaceUrl, "utf8");
  assert.match(source, /sourceRevisionRef = useRef\(0\)/);
  assert.match(source, /fileAcceptanceRevisionRef = useRef\(0\)/);
  assert.match(source, /fileAcceptanceRevisionRef\.current \+= 1/);
  assert.match(source, /markSourceChanged\(screenshotUrl \? "source-ready" : "idle"\)/);
  assert.match(source, /sourceRevisionRef\.current !== requestRevision/);
  assert.match(source, /abortRef\.current !== controller/);
  assert.match(source, /candidate\.candidates\.every/);
  assert.match(source, /请求编号：\$\{requestId\}/);
  assert.match(source, /\[A-Za-z0-9\]\[A-Za-z0-9\._:-\]\{0,127\}/);
  for (const field of ["anatomy", "behavior", "styling", "accessibility"]) {
    assert.match(source, new RegExp(`"${field}"`));
  }
});

test("screenshot headers are budgeted before preview and crops encode asynchronously", async () => {
  const [source, contract] = await Promise.all([
    readFile(regionUrl, "utf8"),
    readFile(contractUrl, "utf8"),
  ]);
  assert.match(source, /MAX_SCREENSHOT_SIDE = 8_192/);
  assert.match(source, /MAX_SCREENSHOT_PIXELS = 16_000_000/);
  for (const mediaType of ["image/png", "image/jpeg", "image/webp", "image/gif"]) {
    assert.match(source, new RegExp(mediaType.replace("/", "\\/")));
  }
  assert.match(source, /await file\.arrayBuffer\(\)/);
  assert.match(source, /gifFrameDimensionsWithinBudget\(bytes\)/);
  assert.match(source, /readUint16\(index \+ 4\)/);
  assert.match(source, /readUint16\(index \+ 6\)/);
  assert.match(source, /canvas\.toBlob\(/);
  assert.match(source, /"image\/png"/);
  assert.match(source, /import \{ MAX_NORMALIZED_SCREENSHOT_SIDE \}/);
  assert.match(contract, /MAX_NORMALIZED_SCREENSHOT_SIDE = 1_360/);
  assert.doesNotMatch(source, /canvas\.toDataURL\(/);
});

test("results contain evidence, uncertainty, implementation, code, and feedback", async () => {
  const source = await readFile(resultUrl, "utf8");
  assert.match(source, /candidate\.evidence/);
  assert.match(source, /result\.uncertainties/);
  assert.match(source, /candidate\.implementation/);
  assert.match(source, /selected\.implementation/);
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
