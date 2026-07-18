import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.WHAT_UI_TEST_BASE_URL;
if (!baseUrl) throw new Error("WHAT_UI_TEST_BASE_URL is required for production HTTP tests.");
const validPngScreenshot = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";

async function requestApi(path, init = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(new URL(path, baseUrl), init);
    if (response.status !== 503) return response;
    const text = await response.clone().text();
    if (!text.startsWith("Your worker restarted mid-request")) return response;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error("Local Worker kept restarting during a request.");
}

test("identify capability probe is private-by-default and cache-safe", async () => {
  const response = await requestApi("/api/identify", {
    headers: { accept: "application/json" },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/i);
  const payload = await response.json();
  assert.equal(payload.managedAi, false);
  assert.equal(payload.visualWebpageCapture, false);
  assert.equal(payload.maxImageBytes, 8 * 1024 * 1024);
  assert.deepEqual(payload.acceptedImageTypes, [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
  ]);
});

test("identify endpoint rejects unsupported bodies before any upstream call", async () => {
  const response = await requestApi("/api/identify", {
    body: "mode=screenshot",
    headers: { "content-type": "text/plain" },
    method: "POST",
  });
  assert.equal(response.status, 415);
  const payload = await response.json();
  assert.equal(payload.error.code, "unsupported_media_type");
  assert.equal(payload.requestId, response.headers.get("x-request-id"));
});

test("identify endpoint validates screenshot bytes and public URLs", async () => {
  const screenshot = await requestApi("/api/identify", {
    body: JSON.stringify({
      mode: "screenshot",
      imageDataUrl: "data:image/png;base64,bm90LWEtcG5n",
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const screenshotText = await screenshot.text();
  let screenshotPayload;
  try {
    screenshotPayload = JSON.parse(screenshotText);
  } catch {
    assert.fail(`Expected JSON, received HTTP ${screenshot.status}: ${screenshotText}`);
  }
  assert.equal(screenshot.status, 400, screenshotText);
  assert.equal(screenshotPayload.error.code, "invalid_screenshot");

  const webpage = await requestApi("/api/identify", {
    body: JSON.stringify({ mode: "webpage", url: "http://localhost/admin" }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  assert.equal(webpage.status, 400);
  assert.equal((await webpage.json()).error.code, "unsafe_webpage_url");
});

test("valid input without a managed or user key returns a bounded setup error", async () => {
  const response = await requestApi("/api/identify", {
    body: JSON.stringify({
      mode: "screenshot",
      imageDataUrl: validPngScreenshot,
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  assert.equal(response.status, 503);
  const payload = await response.json();
  assert.equal(payload.error.code, "ai_not_configured");
  assert.doesNotMatch(JSON.stringify(payload), /sk-|OPENAI_API_KEY/);
});

test("identify endpoint rejects unsafe custom APIs and removed providers locally", async () => {
  const unsafeCustom = await requestApi("/api/identify", {
    body: JSON.stringify({
      mode: "screenshot",
      imageDataUrl: validPngScreenshot,
      providerId: "custom",
      model: "vision-model",
      customBaseUrl: "https://127.0.0.1/v1",
      customProtocol: "openai-chat",
    }),
    headers: {
      "content-type": "application/json",
      "x-ai-api-key": "test-provider-key",
    },
    method: "POST",
  });
  assert.equal(unsafeCustom.status, 400);
  assert.equal((await unsafeCustom.json()).error.code, "unsafe_base_url");

  const untrustedCustom = await requestApi("/api/identify", {
    body: JSON.stringify({
      mode: "screenshot",
      imageDataUrl: validPngScreenshot,
      providerId: "custom",
      model: "vision-model",
      customBaseUrl: "https://api.vendor.com/v1",
      customProtocol: "openai-chat",
    }),
    headers: {
      "content-type": "application/json",
      "x-ai-api-key": "test-provider-key",
    },
    method: "POST",
  });
  assert.equal(untrustedCustom.status, 403);
  assert.equal(
    (await untrustedCustom.json()).error.code,
    "custom_provider_not_allowed",
  );

  const removedProvider = await requestApi("/api/identify", {
    body: JSON.stringify({
      mode: "screenshot",
      imageDataUrl: validPngScreenshot,
      providerId: "deepseek",
      model: "deepseek-v4-flash",
    }),
    headers: {
      "content-type": "application/json",
      "x-ai-api-key": "test-provider-key",
    },
    method: "POST",
  });
  assert.equal(removedProvider.status, 400);
  assert.equal((await removedProvider.json()).error.code, "invalid_provider");
});

test("identify endpoint validates generic provider keys without assuming an sk prefix", async () => {
  const response = await requestApi("/api/identify", {
    body: JSON.stringify({
      mode: "screenshot",
      imageDataUrl: validPngScreenshot,
      providerId: "openai",
      model: "gpt-5.6-sol",
    }),
    headers: {
      "content-type": "application/json",
      "x-ai-api-key": "short",
    },
    method: "POST",
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "invalid_api_key");
});

test("connection checks require a user key before contacting a provider", async () => {
  const response = await requestApi("/api/identify", {
    body: JSON.stringify({
      action: "connect",
      providerId: "siliconflow",
      model: "Qwen/Qwen3.6-27B",
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, "api_key_required");
});

test("SiliconFlow China direct flow prepares and validates browser-side inference", async () => {
  const prepare = await requestApi("/api/identify", {
    body: JSON.stringify({
      action: "prepare-direct",
      mode: "screenshot",
      imageDataUrl: validPngScreenshot,
      context: "测试直连",
      providerId: "siliconflow",
      model: "Qwen/Qwen3.6-27B",
      customBaseUrl: "",
      customProtocol: "openai-chat",
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  assert.equal(prepare.status, 200);
  const prepared = await prepare.json();
  assert.equal(
    prepared.endpoint,
    "https://api.siliconflow.cn/v1/chat/completions",
  );
  assert.equal(prepared.request.model, "Qwen/Qwen3.6-27B");
  assert.equal(prepared.request.max_tokens, 4096);

  const finalize = await requestApi("/api/identify", {
    body: JSON.stringify({
      action: "finalize-direct",
      providerId: "siliconflow",
      model: "Qwen/Qwen3.6-27B",
      upstreamResponse: {
        choices: [{
          message: {
            content: JSON.stringify({
              status: "identified",
              summary: "画面中是一个模态对话框。",
              candidates: [{
                slug: "dialog",
                confidence: "high",
                evidence: ["内容覆盖在页面之上"],
                distinction: "它会阻塞背景交互。",
                implementation: {
                  anatomy: ["标题和内容"],
                  behavior: ["关闭后恢复焦点"],
                  styling: ["使用遮罩"],
                  accessibility: ["使用语义 dialog"],
                },
              }],
              uncertainties: [],
              followUpQuestion: null,
            }),
          },
        }],
      },
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  assert.equal(finalize.status, 200);
  const result = await finalize.json();
  assert.equal(result.candidates[0].slug, "dialog");
  assert.deepEqual(result.candidates[0].implementation.anatomy, ["标题和内容"]);
  assert.equal(result.implementation, undefined);
  assert.match(result.notices[0], /API Key 未经过本站 Worker/);
});
