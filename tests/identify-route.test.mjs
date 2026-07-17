import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.WHAT_UI_TEST_BASE_URL;
if (!baseUrl) throw new Error("WHAT_UI_TEST_BASE_URL is required for production HTTP tests.");

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
  assert.equal((await response.json()).error.code, "unsupported_media_type");
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
      imageDataUrl: "data:image/png;base64,iVBORw0KGgo=",
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  assert.equal(response.status, 503);
  const payload = await response.json();
  assert.equal(payload.error.code, "ai_not_configured");
  assert.doesNotMatch(JSON.stringify(payload), /sk-|OPENAI_API_KEY/);
});

test("identify endpoint rejects unsafe custom APIs and non-visual providers locally", async () => {
  const unsafeCustom = await requestApi("/api/identify", {
    body: JSON.stringify({
      mode: "screenshot",
      imageDataUrl: "data:image/png;base64,iVBORw0KGgo=",
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

  const deepseek = await requestApi("/api/identify", {
    body: JSON.stringify({
      mode: "screenshot",
      imageDataUrl: "data:image/png;base64,iVBORw0KGgo=",
      providerId: "deepseek",
      model: "deepseek-v4-flash",
    }),
    headers: {
      "content-type": "application/json",
      "x-ai-api-key": "test-provider-key",
    },
    method: "POST",
  });
  assert.equal(deepseek.status, 422);
  assert.equal((await deepseek.json()).error.code, "provider_has_no_vision");
});

test("identify endpoint validates generic provider keys without assuming an sk prefix", async () => {
  const response = await requestApi("/api/identify", {
    body: JSON.stringify({
      mode: "screenshot",
      imageDataUrl: "data:image/png;base64,iVBORw0KGgo=",
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
