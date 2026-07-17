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

test("BYOK supports session-only use and encrypted browser storage", async () => {
  const [workspace, settings, vault] = await Promise.all([
    readFile(workspaceUrl, "utf8"),
    readFile(settingsUrl, "utf8"),
    readFile(vaultUrl, "utf8"),
  ]);
  assert.match(settings, /type=\{showKey \? "text" : "password"\}/);
  assert.match(workspace, /x-ai-api-key/);
  assert.match(workspace, /resolvedProvider\.id === "xai" \? "image\/jpeg"/);
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
  assert.doesNotMatch(source, /<IdentificationWorkspace|id="identify"/);
  assert.match(source, /aria-haspopup="dialog"/);
  assert.match(source, /id="component-search"/);
  assert.ok(source.indexOf("id=\"component-search\"") < source.indexOf("id=\"terms\""));
  assert.ok(source.indexOf("id=\"terms\"") < source.indexOf("id=\"catalog\""));
  assert.match(source, /看见组件却不知道名称/);
  assert.match(source, /<GitHubLink/);
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
  assert.match(settings, /在此浏览器加密保存/);
  assert.match(settings, /apiKey: ""/);
  assert.match(settings, /OpenAI Chat Completions/);
  for (const provider of [
    "openai",
    "anthropic",
    "kimi",
    "kimi-global",
    "siliconflow",
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

test("API settings replace the empty result column without expanding the input column", async () => {
  const [workspace, settings] = await Promise.all([
    readFile(workspaceUrl, "utf8"),
    readFile(settingsUrl, "utf8"),
  ]);
  assert.doesNotMatch(workspace, /analyzer-intro/);
  assert.match(workspace, /providerSettingsOpen && capabilities/);
  assert.match(workspace, /<AiProviderSettingsPanel/);
  assert.match(workspace, /<AiProviderSettingsSummary/);
  assert.match(settings, /onOpenChange\(!open\)/);
  assert.match(settings, /provider-settings-toggle/);
  assert.match(settings, /providerTriggerRef\.current\?\.focus\(\)/);
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
