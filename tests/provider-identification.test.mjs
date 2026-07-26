import assert from "node:assert/strict";
import test from "node:test";
import { loadIdentificationModules } from "./identification-loader.mjs";

const {
  providerConfig,
  providerIdentification,
} = await loadIdentificationModules();

const allowedSlugs = ["dialog", "popover"];
const screenshot = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

function makeResult() {
  return {
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
  };
}

function options(provider, fetchImpl) {
  return {
    apiKey: "provider-test-key",
    provider,
    allowedSlugs,
    catalogKnowledge: JSON.stringify([{ slug: "dialog" }, { slug: "popover" }]),
    instructions: "请使用简体中文。",
    input: { mode: "screenshot", imageDataUrl: screenshot },
    fetchImpl,
  };
}

test("provider presets use canonical endpoints and custom URLs are normalized safely", () => {
  assert.equal(providerConfig.aiProviderPresets.length, 9);
  assert.equal(
    providerConfig.normalizeCustomApiBaseUrl("https://api.vendor.com"),
    "https://api.vendor.com/v1",
  );
  assert.equal(
    providerConfig.normalizeCustomApiBaseUrl("https://api.vendor.com/v1/chat/completions"),
    "https://api.vendor.com/v1",
  );
  assert.equal(
    providerConfig.normalizeCustomApiBaseUrl("https://api.vendor.com/compatible/v1/"),
    "https://api.vendor.com/compatible/v1",
  );
  for (const unsafe of [
    "http://api.vendor.com",
    "https://localhost/v1",
    "https://127.0.0.1/v1",
    "https://127.0.0.1.nip.io/v1",
    "https://169.254.169.254.sslip.io/v1",
    "https://metadata.example.arpa/v1",
    "https://api.vendor.com:8443/v1",
    "https://user:pass@api.vendor.com/v1",
    "https://api.vendor.com/v1?token=secret",
  ]) {
    assert.throws(() => providerConfig.normalizeCustomApiBaseUrl(unsafe));
  }

  const openai = providerConfig.resolveAiProvider(
    "openai",
    "gpt-5.6-sol",
    "https://attacker.invalid/v1",
  );
  assert.equal(openai.baseUrl, "https://api.openai.com/v1");
  assert.equal(providerConfig.providerEndpoint(openai), "https://api.openai.com/v1/responses");
  for (const removedProvider of ["deepseek", "groq", "together", "mistral"]) {
    assert.throws(() => providerConfig.resolveAiProvider(removedProvider, "vision-model"));
  }
  const anthropic = providerConfig.resolveAiProvider("anthropic", "claude-sonnet-5");
  assert.equal(providerConfig.providerEndpoint(anthropic), "https://api.anthropic.com/v1/messages");

  const siliconflowChina = providerConfig.resolveAiProvider(
    "siliconflow",
    "Qwen/Qwen3.6-27B",
  );
  const siliconflowGlobal = providerConfig.resolveAiProvider(
    "siliconflow-global",
    "Qwen/Qwen3.6-27B",
  );
  assert.equal(siliconflowChina.baseUrl, "https://api.siliconflow.cn/v1");
  assert.equal(siliconflowGlobal.baseUrl, "https://api.siliconflow.com/v1");
  assert.equal(
    providerConfig.providerConnectionEndpoint(siliconflowChina),
    "https://api.siliconflow.cn/v1/models?type=text&sub_type=chat",
  );
});

test("connection checks validate keys without sending an inference request", async () => {
  const siliconflow = providerConfig.resolveAiProvider(
    "siliconflow",
    "Qwen/Qwen3.6-27B",
  );
  let request;
  const connected = await providerIdentification.verifyProviderConnection({
    apiKey: "provider-test-key",
    provider: siliconflow,
    fetchImpl: async (url, init) => {
      request = { url, init };
      return Response.json({
        object: "list",
        data: [{ id: "Qwen/Qwen3.6-27B", object: "model" }],
      });
    },
  });
  assert.equal(
    request.url,
    "https://api.siliconflow.cn/v1/models?type=text&sub_type=chat",
  );
  assert.equal(request.init.method, "GET");
  assert.equal(request.init.headers.authorization, "Bearer provider-test-key");
  assert.equal(request.init.redirect, "error");
  assert.equal(connected.modelAvailable, true);

  await assert.rejects(
    providerIdentification.verifyProviderConnection({
      apiKey: "provider-test-key",
      provider: siliconflow,
      fetchImpl: async () => Response.json(
        { message: "invalid api key" },
        { status: 401 },
      ),
    }),
    (error) => error instanceof providerIdentification.ProviderIdentificationError
      && error.status === 401,
  );
});

test("direct chat responses still pass the shared schema validator", () => {
  const parsed = providerIdentification.parseOpenAIChatIdentificationResponse(
    { choices: [{ message: { content: JSON.stringify(makeResult()) } }] },
    allowedSlugs,
    "硅基流动 · 中国站",
  );
  assert.equal(parsed.candidates[0].slug, "dialog");
});

test("OpenAI-compatible chat requests honor structured and image-shape capabilities", async () => {
  const kimi = providerConfig.resolveAiProvider("kimi", "kimi-k2.6");
  const kimiRequest = await providerIdentification.createOpenAIChatIdentificationRequest(
    options(kimi, fetch),
  );
  assert.equal(kimiRequest.response_format.type, "json_schema");
  assert.equal(kimiRequest.max_tokens, 4096);
  assert.equal(kimiRequest.messages[1].content[1].image_url.url, screenshot);
  assert.equal(kimiRequest.temperature, 1);

  const gemini = providerConfig.resolveAiProvider("gemini", "gemini-3.5-flash");
  const geminiRequest = await providerIdentification.createOpenAIChatIdentificationRequest(
    options(gemini, fetch),
  );
  assert.equal(geminiRequest.temperature, 1);

  const openrouter = providerConfig.resolveAiProvider(
    "openrouter",
    "google/gemini-3.5-flash",
  );
  const openrouterRequest = await providerIdentification.createOpenAIChatIdentificationRequest(
    options(openrouter, fetch),
  );
  assert.equal(openrouterRequest.provider.require_parameters, true);

  const xai = providerConfig.resolveAiProvider("xai", "grok-4.5");
  assert.deepEqual(xai.allowedImageMediaTypes, ["image/jpeg", "image/png"]);
  await assert.rejects(() => providerIdentification.createOpenAIChatIdentificationRequest({
    ...options(xai, fetch),
    input: {
      mode: "screenshot",
      imageDataUrl: "data:image/webp;base64,UklGRjwAAABXRUJQVlA4IDAAAADQAQCdASoBAAEAAUAmJaACdLoB+AADsAD+8ut//NgVzXPv9//S4P0uD9Lg/9KQAAA=",
    },
  }), /does not support image\/webp/);

  await assert.rejects(
    () => providerIdentification.createOpenAIChatIdentificationRequest({
      ...options(kimi, fetch),
      catalogKnowledge: JSON.stringify([{
        slug: "dialog",
        summary: "x".repeat(64_000),
      }]),
    }),
    /catalogKnowledge exceeds/i,
  );
});

test("compatible Chat and native Anthropic adapters validate structured results", async () => {
  const kimi = providerConfig.resolveAiProvider("kimi", "kimi-k2.6");
  let chatRequest;
  const chatResponse = await providerIdentification.identifyWithProvider(options(
    kimi,
    async (url, init) => {
      chatRequest = { url, init, body: JSON.parse(init.body) };
      return Response.json({
        choices: [{ message: { content: JSON.stringify(makeResult()) } }],
      });
    },
  ));
  assert.equal(chatRequest.url, "https://api.moonshot.cn/v1/chat/completions");
  assert.equal(chatRequest.init.headers.authorization, "Bearer provider-test-key");
  assert.equal(chatRequest.init.redirect, "error");
  assert.equal(chatResponse.result.candidates[0].slug, "dialog");
  assert.deepEqual(chatResponse.sources, []);

  const anthropic = providerConfig.resolveAiProvider("anthropic", "claude-sonnet-5");
  let anthropicRequest;
  const anthropicResponse = await providerIdentification.identifyWithProvider(options(
    anthropic,
    async (url, init) => {
      anthropicRequest = { url, init, body: JSON.parse(init.body) };
      return Response.json({
        content: [{
          type: "tool_use",
          name: "submit_identification",
          input: makeResult(),
        }],
      });
    },
  ));
  assert.equal(anthropicRequest.url, "https://api.anthropic.com/v1/messages");
  assert.equal(anthropicRequest.init.headers["x-api-key"], "provider-test-key");
  assert.equal(anthropicRequest.init.headers["anthropic-version"], "2023-06-01");
  assert.equal(anthropicRequest.body.tool_choice.name, "submit_identification");
  assert.equal(anthropicRequest.body.tools[0].strict, true);
  assert.equal(anthropicResponse.result.status, "identified");
});

test("provider adapters distinguish truncated outputs from invalid JSON", async () => {
  const kimi = providerConfig.resolveAiProvider("kimi", "kimi-k2.6");
  await assert.rejects(
    providerIdentification.identifyWithProvider(options(
      kimi,
      async () => Response.json({
        choices: [{ finish_reason: "length", message: { content: "{}" } }],
      }),
    )),
    (error) => error instanceof providerIdentification.ProviderIdentificationError
      && error.code === "incomplete",
  );

  const anthropic = providerConfig.resolveAiProvider("anthropic", "claude-sonnet-5");
  await assert.rejects(
    providerIdentification.identifyWithProvider(options(
      anthropic,
      async () => Response.json({ stop_reason: "max_tokens", content: [] }),
    )),
    (error) => error instanceof providerIdentification.ProviderIdentificationError
      && error.code === "incomplete",
  );
});

test("custom Responses endpoints are bounded and do not inherit OpenAI-only tools", async () => {
  const custom = providerConfig.resolveAiProvider(
    "custom",
    "vision-model",
    "https://api.vendor.com",
    "openai-responses",
  );
  let upstreamRequest;
  const response = await providerIdentification.identifyWithProvider(options(
    custom,
    async (url, init) => {
      upstreamRequest = { url, init, body: JSON.parse(init.body) };
      return Response.json({
        status: "completed",
        output: [{
          content: [{ type: "output_text", text: JSON.stringify(makeResult()) }],
        }],
      });
    },
  ));
  assert.equal(upstreamRequest.url, "https://api.vendor.com/v1/responses");
  assert.equal(upstreamRequest.init.redirect, "error");
  assert.equal(upstreamRequest.body.store, false);
  assert.equal(upstreamRequest.body.max_output_tokens, 4096);
  assert.equal(upstreamRequest.body.reasoning, undefined);
  assert.equal(upstreamRequest.body.tools, undefined);
  assert.equal(response.result.summary, makeResult().summary);
});

test("provider adapters reject oversized upstream responses before parsing", async () => {
  const kimi = providerConfig.resolveAiProvider("kimi", "kimi-k2.6");
  await assert.rejects(
    providerIdentification.identifyWithProvider(options(
      kimi,
      async () => new Response("{}", {
        headers: { "content-length": String(1024 * 1024 + 1) },
      }),
    )),
    (error) => error instanceof providerIdentification.ProviderIdentificationError
      && error.code === "upstream",
  );
});
