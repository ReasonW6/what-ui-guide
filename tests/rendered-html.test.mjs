import assert from "node:assert/strict";
import test from "node:test";
import { loadCatalogModule } from "./catalog-loader.mjs";

let workerPromise;

async function getWorker() {
  if (!workerPromise) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
    workerPromise = import(workerUrl.href).then((module) => module.default);
  }
  return workerPromise;
}

async function render(pathname = "/") {
  const worker = await getWorker();
  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("home page renders the finished bilingual catalog", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /这叫啥 UI/);
  assert.match(html, /交互式演示/);
  assert.match(html, /Interactive Demo/i);
  assert.match(html, /组件目录/);
  assert.match(html, /href="\/components\/navigation-bar"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("all 75 component detail routes render and unknown slugs return 404", async () => {
  const { catalog } = await loadCatalogModule();
  for (let index = 0; index < catalog.length; index += 10) {
    const batch = catalog.slice(index, index + 10);
    const responses = await Promise.all(
      batch.map((item) => render(`/components/${item.slug}`)),
    );
    responses.forEach((response, offset) => {
      assert.equal(response.status, 200, batch[offset].slug);
    });
  }

  const slider = await render("/components/slider");
  const sliderHtml = await slider.text();
  assert.match(sliderHtml, /滑块/);
  assert.match(sliderHtml, /Slider/);
  assert.match(sliderHtml, /HTML \/ CSS \/ JS/);
  assert.match(sliderHtml, /React \+ CSS/);

  const missing = await render("/components/not-a-real-component");
  assert.equal(missing.status, 404);
});
