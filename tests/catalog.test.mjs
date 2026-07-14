import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { loadCatalogModule } from "./catalog-loader.mjs";

test("catalog contains the planned 75 complete bilingual entries", async () => {
  const { catalog, categories, validateCatalog } = await loadCatalogModule();
  assert.equal(catalog.length, 75);
  assert.equal(new Set(catalog.map((item) => item.slug)).size, 75);
  assert.equal(categories.length, 9);
  assert.deepEqual(validateCatalog(), []);

  const counts = Object.fromEntries(
    categories.map((category) => [
      category.id,
      catalog.filter((item) => item.category === category.id).length,
    ]),
  );
  assert.deepEqual(counts, {
    navigation: 9,
    actions: 8,
    inputs: 9,
    selection: 10,
    feedback: 9,
    overlays: 9,
    content: 7,
    data: 6,
    motion: 8,
  });
});

test("natural-language, alias, category, and platform search works", async () => {
  const { filterCatalog } = await loadCatalogModule();
  assert.equal(filterCatalog({ q: "可以拖动的圆点" })[0]?.slug, "slider");
  assert.equal(filterCatalog({ q: "右键出现的菜单" })[0]?.slug, "context-menu");
  assert.equal(filterCatalog({ q: "图片左右对比" })[0]?.slug, "before-after-slider");
  assert.ok(filterCatalog({ q: "NSSlider" }).some((item) => item.slug === "slider"));
  assert.ok(
    filterCatalog({ category: "navigation", platform: "mobile" }).every(
      (item) => item.category === "navigation" && item.platforms.includes("mobile"),
    ),
  );
});

test("every snippet is present and syntactically parseable", async () => {
  const { catalog } = await loadCatalogModule();
  for (const item of catalog) {
    for (const file of item.code.vanilla) {
      assert.ok(file.code.trim(), `${item.slug}/${file.name} is empty`);
      if (file.language === "js") {
        assert.doesNotThrow(() => new vm.Script(file.code), `${item.slug}/${file.name}`);
      }
    }
    for (const file of item.code.react) {
      assert.ok(file.code.trim(), `${item.slug}/${file.name} is empty`);
      if (file.language === "jsx") {
        const result = ts.transpileModule(file.code, {
          compilerOptions: {
            jsx: ts.JsxEmit.ReactJSX,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
          reportDiagnostics: true,
        });
        const errors = (result.diagnostics ?? []).filter(
          (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
        );
        assert.deepEqual(errors, [], `${item.slug}/${file.name} has syntax errors`);
      }
    }
  }
});

test("DemoRegistry covers the same 75 slugs as the catalog", async () => {
  const { catalog } = await loadCatalogModule();
  const source = await readFile(new URL("../app/ui/DemoStage.tsx", import.meta.url), "utf8");
  const start = source.indexOf("export const demoSlugs = [");
  const end = source.indexOf("] as const;", start);
  assert.ok(start >= 0 && end > start, "demoSlugs registry was not found");
  const slugs = [...source.slice(start, end).matchAll(/"([a-z0-9-]+)"/g)].map(
    (match) => match[1],
  );
  assert.equal(slugs.length, 75);
  assert.deepEqual(
    slugs.slice().sort(),
    catalog.map((item) => item.slug).slice().sort(),
  );
});

test("all AI prompts are project-ready and library-friendly", async () => {
  const { catalog } = await loadCatalogModule();
  for (const item of catalog) {
    assert.doesNotMatch(item.aiPrompt, /不要依赖第三方组件库/);
    assert.match(item.aiPrompt, /成熟组件库，优先复用并按需求定制/);
    assert.ok(item.aiPrompt.includes(item.anatomy[0]), `${item.slug} prompt omits anatomy`);
    assert.ok(item.aiPrompt.includes(item.accessibility[0]), `${item.slug} prompt omits accessibility guidance`);
  }
});
