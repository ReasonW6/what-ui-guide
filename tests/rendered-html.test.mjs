import assert from "node:assert/strict";
import test from "node:test";
import { loadCatalogModule } from "./catalog-loader.mjs";

const baseUrl = process.env.WHAT_UI_TEST_BASE_URL;
if (!baseUrl) throw new Error("WHAT_UI_TEST_BASE_URL is required for production HTTP tests.");

async function render(pathname = "/") {
  return fetch(new URL(pathname, baseUrl), {
    headers: { accept: "text/html" },
  });
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
  assert.match(html, /class="catalog-grid"/);
  assert.match(html, /href="\/components\/navigation-bar"/);
  assert.match(html, /href="#main-content"/);
  assert.doesNotMatch(html, /aria-controls="identification-dialog"/);
  assert.match(html, />AI 识别</);
  assert.doesNotMatch(html, /id="identification-dialog"|class="analyzer-shell"|class="analyzer-tabs"/);
  assert.match(html, /data-demo-placeholder="navigation-bar"/);
  assert.match(html, /href="\/components\/navigation-bar"/);
  assert.match(html, /看见组件却不知道名称/);
  assert.ok(html.indexOf('id="component-search"') < html.indexOf('id="terms"'));
  assert.ok(html.indexOf('id="terms"') < html.indexOf('id="catalog"'));
  assert.match(html, /href="https:\/\/github\.com\/ReasonW6\/what-ui-guide"/);
  assert.match(html, /aria-label="在 GitHub 查看项目（新窗口）"/);
  assert.match(html, /<header[^>]*class="site-header"[^>]*>[\s\S]*<main[^>]*id="main-content"[\s\S]*<footer[^>]*class="site-footer"/);
  assert.match(html, /<meta[^>]+name="twitter:card"[^>]+content="summary_large_image"/);
  assert.match(html, /<link[^>]+href="\/favicon\.svg"[^>]+rel="icon"[^>]*>/);
  assert.doesNotMatch(html, /<link[^>]+rel="icon"[^>]+href="https?:\/\//);
  assert.match(html, /https:\/\/what-ui-guide\.reasonw6\.chatgpt\.site\/og\.png/);
  assert.match(html, /<link[^>]+rel="canonical"[^>]+href="https:\/\/what-ui-guide\.reasonw6\.chatgpt\.site\/"/);
  assert.match(html, /<title>AI UI\/UX 视觉词典｜这叫啥 UI？<\/title>/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("all 81 component detail routes render and unknown slugs return 404", async () => {
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
  assert.match(sliderHtml, /class="detail-layout"/);
  assert.match(sliderHtml, /class="detail-visual-sticky"/);
  assert.match(sliderHtml, /<meta[^>]+property="og:title"[^>]+content="滑块 \/ Slider"/);
  assert.match(sliderHtml, /<meta[^>]+property="og:image"[^>]+content="https:\/\/what-ui-guide\.reasonw6\.chatgpt\.site\/og\.png"/);
  assert.match(sliderHtml, /<link[^>]+rel="canonical"[^>]+href="https:\/\/what-ui-guide\.reasonw6\.chatgpt\.site\/components\/slider"/);
  assert.match(sliderHtml, /href="#component-content"/);
  assert.match(
    sliderHtml,
    /Slider 选择单值；Range Slider 选择区间；Progress Bar \/ Ring 展示确定进度；Spinner 只表示处理中/,
  );
  assert.match(sliderHtml, /<header[^>]*class="detail-header"[^>]*>[\s\S]*<main[^>]*class="detail-main"[^>]*>[\s\S]*<footer[^>]*class="site-footer"/);

  const missing = await render("/components/not-a-real-component");
  assert.equal(missing.status, 404);
});
