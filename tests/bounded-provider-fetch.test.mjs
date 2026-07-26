import assert from "node:assert/strict";
import test from "node:test";
import { loadIdentificationModules } from "./identification-loader.mjs";

const { boundedProviderFetch } = await loadIdentificationModules();

test("browser-direct provider fetch shares the 45 second and 1 MiB budgets", () => {
  assert.equal(boundedProviderFetch.PROVIDER_FETCH_TIMEOUT_MS, 45_000);
  assert.equal(
    boundedProviderFetch.PROVIDER_FETCH_MAX_RESPONSE_BYTES,
    1024 * 1024,
  );
});

test("browser-direct provider fetch reads JSON incrementally within the budget", async () => {
  const encoder = new TextEncoder();
  const chunks = [
    encoder.encode('{"data":['),
    encoder.encode('{"id":"model"}'),
    encoder.encode("]}"),
  ];
  const { payload, response } = await boundedProviderFetch.fetchBoundedProviderJson(
    "https://api.siliconflow.cn/v1/models",
    { method: "GET" },
    {
      fetchImpl: async (_input, init) => {
        assert.ok(init.signal instanceof AbortSignal);
        return new Response(new ReadableStream({
          pull(controller) {
            const chunk = chunks.shift();
            if (chunk) controller.enqueue(chunk);
            else controller.close();
          },
        }), { status: 200 });
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(payload, { data: [{ id: "model" }] });
});

test("browser-direct provider fetch cancels an oversized streamed response", async () => {
  let cancelled = false;
  const chunk = new Uint8Array(600 * 1024);
  const response = new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(chunk);
      controller.enqueue(chunk);
    },
    cancel() {
      cancelled = true;
    },
  }));

  await assert.rejects(
    boundedProviderFetch.fetchBoundedProviderJson(
      "https://api.siliconflow.cn/v1/models",
      {},
      { fetchImpl: async () => response },
    ),
    /allowed size/i,
  );
  assert.equal(cancelled, true);
});

test("browser-direct provider fetch timeout covers response streaming", async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream({
    cancel() {
      cancelled = true;
    },
  }));
  const started = performance.now();

  await assert.rejects(
    boundedProviderFetch.fetchBoundedProviderJson(
      "https://api.siliconflow.cn/v1/models",
      {},
      {
        fetchImpl: async () => response,
        timeoutMs: 25,
      },
    ),
    /timed out/i,
  );
  assert.ok(performance.now() - started < 500);
  assert.equal(cancelled, true);
});

test("browser-direct provider fetch respects caller cancellation while reading", async () => {
  let cancelled = false;
  const controller = new AbortController();
  const response = new Response(new ReadableStream({
    cancel() {
      cancelled = true;
    },
  }));
  const request = boundedProviderFetch.fetchBoundedProviderJson(
    "https://api.siliconflow.cn/v1/models",
    {},
    {
      fetchImpl: async () => response,
      signal: controller.signal,
    },
  );

  controller.abort(new Error("connection check cancelled"));
  await assert.rejects(request, /connection check cancelled/i);
  assert.equal(cancelled, true);
});
