import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { loadCatalogModule } from "./catalog-loader.mjs";

test("catalog contains the planned 90 complete bilingual entries", async () => {
  const { catalog, categories, validateCatalog } = await loadCatalogModule();
  assert.equal(catalog.length, 90);
  assert.equal(new Set(catalog.map((item) => item.slug)).size, 90);
  assert.equal(categories.length, 9);
  assert.deepEqual(validateCatalog(), []);

  const counts = Object.fromEntries(
    categories.map((category) => [
      category.id,
      catalog.filter((item) => item.category === category.id).length,
    ]),
  );
  assert.deepEqual(counts, {
    navigation: 10,
    actions: 10,
    inputs: 11,
    selection: 13,
    feedback: 11,
    overlays: 10,
    content: 10,
    data: 6,
    motion: 9,
  });
});

test("natural-language, alias, category, and platform search works", async () => {
  const { createCatalogSearchText, filterCatalog } = await loadCatalogModule();
  assert.equal(filterCatalog({ q: "可以拖动的圆点" })[0]?.slug, "slider");
  assert.equal(filterCatalog({ q: "右键出现的菜单" })[0]?.slug, "context-menu");
  assert.equal(filterCatalog({ q: "图片左右对比" })[0]?.slug, "before-after-slider");
  assert.equal(filterCatalog({ q: "Before—After, Slider" })[0]?.slug, "before-after-slider");
  assert.ok(filterCatalog({ q: "NSSlider" }).some((item) => item.slug === "slider"));
  assert.ok(filterCatalog({ q: "导航、定位" }).some((item) => item.slug === "navigation-bar"));
  assert.ok(filterCatalog({ q: "移动端" }).some((item) => item.slug === "bottom-navigation"));
  assert.match(
    createCatalogSearchText(filterCatalog({ q: "底部导航" })[0]),
    /导航与定位.*mobile.*移动端/i,
  );
  assert.ok(
    filterCatalog({ category: "navigation", platform: "mobile" }).every(
      (item) => item.category === "navigation" && item.platforms.includes("mobile"),
    ),
  );
});

test("homepage consumes the shared search index and filtering helper", async () => {
  const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const browserSource = await readFile(
    new URL("../app/ui/CatalogBrowser.tsx", import.meta.url),
    "utf8",
  );
  assert.match(pageSource, /createCatalogSearchText\(item\)/);
  assert.match(browserSource, /filterCatalogSearchEntries\(items,/);
  assert.doesNotMatch(browserSource, /function normalize\(/);
});

test("copy failures are announced and styled as errors", async () => {
  const promptSource = await readFile(
    new URL("../app/ui/InteractiveDetail.tsx", import.meta.url),
    "utf8",
  );
  const codeSource = await readFile(
    new URL("../app/ui/CodeExplorer.tsx", import.meta.url),
    "utf8",
  );
  const globalCss = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const codeCss = await readFile(
    new URL("../app/ui/code-explorer.css", import.meta.url),
    "utf8",
  );

  for (const source of [promptSource, codeSource]) {
    assert.match(source, /state: "error"/);
    assert.match(source, /state === "error" \? "alert" : "status"/);
  }
  assert.match(globalCss, /\.copy-inline-status\[data-state="error"\][^{]*\{[^}]*var\(--danger\)/s);
  assert.match(codeCss, /\.copy-status\[data-state="error"\][^{]*\{[^}]*var\(--danger\)/s);
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

test("copyable React samples keep icon buttons named and radio groups instance-scoped", async () => {
  const { catalog } = await loadCatalogModule();
  const iconButton = catalog.find((item) => item.slug === "icon-button");
  const radioGroup = catalog.find((item) => item.slug === "radio-group");
  assert.ok(iconButton);
  assert.ok(radioGroup);

  const iconButtonReact = iconButton.code.react.map((file) => file.code).join("\n");
  assert.match(iconButtonReact, /aria-label="收藏"/);

  const radioGroupReact = radioGroup.code.react.map((file) => file.code).join("\n");
  assert.match(radioGroupReact, /useId/);
  assert.match(radioGroupReact, /name=\{groupName\}/);
  assert.doesNotMatch(radioGroupReact, /name="choice"/);
});

test("long code examples contain real formatting line breaks", async () => {
  const { catalog } = await loadCatalogModule();
  for (const item of catalog) {
    for (const file of [...item.code.vanilla, ...item.code.react]) {
      if (file.code.length > 100) {
        assert.ok(file.code.includes("\n"), `${item.slug}/${file.name} is an unreadable single line`);
      }
    }
  }
});

test("copyable examples keep every rendered line readable", async () => {
  const { catalog } = await loadCatalogModule();
  for (const item of catalog) {
    for (const file of [...item.code.vanilla, ...item.code.react]) {
      for (const [index, line] of file.code.split("\n").entries()) {
        assert.ok(
          line.length <= 120,
          `${item.slug}/${file.name}:${index + 1} exceeds 120 characters`,
        );
      }
    }
  }
});

test("commonly confused patterns have behavior-specific code samples", async () => {
  const { catalog } = await loadCatalogModule();
  const code = (slug, family, language) => {
    const item = catalog.find((entry) => entry.slug === slug);
    assert.ok(item, `${slug} is missing`);
    const files = family === "vanilla" ? item.code.vanilla : item.code.react;
    const file = files.find((entry) => entry.language === language);
    assert.ok(file, `${slug}/${family}/${language} is missing`);
    return file.code;
  };

  assert.match(code("range-slider", "vanilla", "js"), /minimum\.value.*maximum\.value/s);
  assert.match(code("range-slider", "react", "jsx"), /setMinimum[\s\S]*setMaximum/);
  assert.doesNotMatch(code("spinner", "react", "jsx"), /<progress/);
  assert.match(code("spinner", "react", "jsx"), /className="loader"/);

  assert.match(code("alert-dialog", "vanilla", "html"), /role="alertdialog"/);
  assert.match(code("side-sheet", "vanilla", "html"), /class="side-sheet"/);
  assert.match(code("lightbox", "react", "jsx"), /className="lightbox"[\s\S]*figcaption/);

  assert.match(code("infinite-scroll", "vanilla", "js"), /IntersectionObserver/);
  assert.match(code("infinite-scroll", "react", "jsx"), /useEffect[\s\S]*IntersectionObserver/);
  assert.match(code("parallax-scrolling", "vanilla", "js"), /translateY[\s\S]*scrollTop/);
  assert.match(code("parallax-scrolling", "react", "jsx"), /onScroll[\s\S]*translateY/);

  assert.match(code("drag-and-drop", "vanilla", "js"), /dragstart[\s\S]*drop/);
  assert.match(code("drag-and-drop", "react", "jsx"), /draggable[\s\S]*onDrop/);
  assert.match(code("tooltip", "vanilla", "html"), /role="tooltip" hidden/);
  assert.match(code("tooltip", "react", "jsx"), /useState[\s\S]*role="tooltip"/);
  assert.match(code("hover-card", "react", "jsx"), /aria-expanded[\s\S]*<aside/);
  assert.match(code("truncated-text", "vanilla", "js"), /aria-expanded[\s\S]*classList\.toggle/);
  assert.match(code("truncated-text", "react", "jsx"), /aria-expanded[\s\S]*setExpanded/);
});

test("copyable samples preserve the advertised interaction semantics", async () => {
  const { catalog } = await loadCatalogModule();
  const code = (slug, family, language) => {
    const item = catalog.find((entry) => entry.slug === slug);
    const files = family === "vanilla" ? item?.code.vanilla : item?.code.react;
    const file = files?.find((entry) => entry.language === language);
    assert.ok(file, `${slug}/${family}/${language} is missing`);
    return file.code;
  };

  assert.match(code("navigation-drawer", "vanilla", "html"), /drawer-backdrop[\s\S]*<nav/);
  assert.match(code("navigation-drawer", "vanilla", "js"), /Escape/);
  assert.match(code("navigation-drawer", "vanilla", "js"), /trigger\.focus/);
  assert.match(code("navigation-bar", "vanilla", "html"), /主导航[\s\S]*打开账户菜单/);
  assert.match(code("navigation-bar", "react", "jsx"), /打开账户菜单[\s\S]*setStatus/);
  assert.match(code("button-group", "react", "jsx"), /role="group"[\s\S]*setSelected/);
  assert.match(code("tags-input", "vanilla", "js"), /addTag[\s\S]*parentElement\.remove/);
  assert.match(code("tags-input", "react", "jsx"), /setTags[\s\S]*onKeyDown/);
  assert.match(code("file-upload", "vanilla", "js"), /dragover[\s\S]*drop/);
  assert.match(code("file-upload", "react", "jsx"), /onDragOver[\s\S]*onDrop/);
  assert.match(code("image-gallery", "vanilla", "js"), /aria-pressed[\s\S]*preview\.textContent/);
  assert.match(code("image-gallery", "react", "jsx"), /useState[\s\S]*setSelected/);
  assert.match(code("data-grid", "vanilla", "js"), /ArrowLeft[\s\S]*ArrowDown/);
  assert.match(code("data-grid", "vanilla", "js"), /focus/);
  assert.match(code("data-grid", "react", "jsx"), /aria-selected[\s\S]*onKeyDown/);
  assert.match(code("pan-and-zoom", "vanilla", "js"), /pointerdown/);
  assert.match(code("pan-and-zoom", "vanilla", "js"), /translate/);
  assert.match(code("pan-and-zoom", "react", "jsx"), /onPointerMove[\s\S]*setPosition/);

  assert.match(code("split-button", "vanilla", "html"), /立即发布[\s\S]*定时发布[\s\S]*保存草稿/);
  assert.match(code("split-button", "react", "jsx"), /定时发布[\s\S]*保存草稿[\s\S]*setOpen/);
  assert.match(code("toolbar", "react", "jsx"), /role="toolbar"[\s\S]*onClick/);
  assert.match(code("anchor-navigation", "vanilla", "html"), /href="#overview"[\s\S]*id="overview"/);
  assert.match(code("inline-validation", "react", "jsx"), /aria-invalid[\s\S]*onChange/);
  assert.match(code("tooltip", "react", "jsx"), /aria-label="查看命令面板说明"/);
  assert.match(code("toast", "vanilla", "js"), /setTimeout[\s\S]*pointerenter[\s\S]*focusin/);
  assert.match(code("toast", "react", "jsx"), /useEffect[\s\S]*hovered[\s\S]*focused/);
  assert.match(code("hover-card", "vanilla", "html"), /<a href="\/people\/lin"[\s\S]*<aside/);
  assert.match(code("hover-card", "react", "jsx"), /<a href="\/people\/lin"[\s\S]*<aside/);
  assert.match(code("lightbox", "vanilla", "html"), /上一张照片[\s\S]*下一张照片/);
  assert.match(code("lightbox", "react", "jsx"), /setIndex[\s\S]*figcaption/);
  assert.match(code("calendar-view", "vanilla", "html"), /设计评审[\s\S]*版本发布/);
  assert.match(code("calendar-view", "react", "jsx"), /setSelection[\s\S]*设计评审/);
  assert.equal((code("accordion", "vanilla", "html").match(/<details/g) ?? []).length, 3);
  assert.equal((code("accordion", "react", "jsx").match(/<details/g) ?? []).length, 3);
  assert.match(code("lazy-loading", "react", "css"), /linear-gradient/);
  assert.match(code("lazy-loading", "vanilla", "html"), /R0lGODlhAQABAIAAAAAAAP\/\/\/ywAAAAAAQABAAACAUwAOw==/);
  assert.doesNotMatch(code("lazy-loading", "vanilla", "html"), /R0lGODlhAQABAAAAACw=/);
});

test("new reference patterns have specific, runnable code samples", async () => {
  const { catalog } = await loadCatalogModule();
  const code = (slug, family, language) => {
    const item = catalog.find((entry) => entry.slug === slug);
    const files = family === "vanilla" ? item?.code.vanilla : item?.code.react;
    const file = files?.find((entry) => entry.language === language);
    assert.ok(file, `${slug}/${family}/${language} is missing`);
    return file.code;
  };

  assert.match(code("split-view", "vanilla", "html"), /role="separator"[\s\S]*aria-valuenow/);
  assert.match(code("split-view", "react", "jsx"), /setSize[\s\S]*onKeyDown/);
  assert.match(code("command-palette", "vanilla", "html"), /<dialog[\s\S]*type="search"/);
  assert.match(code("command-palette", "vanilla", "js"), /showModal[\s\S]*close[\s\S]*trigger\.focus/);
  assert.match(code("command-palette", "react", "jsx"), /showModal/);
  assert.match(code("command-palette", "react", "jsx"), /<dialog[\s\S]*onClose/);
  assert.match(code("command-palette", "react", "jsx"), /commands\.filter[\s\S]*run\(command\)/);
  assert.match(code("focus-ring", "vanilla", "css"), /:focus-visible[\s\S]*outline/);
  assert.match(code("progress-ring", "vanilla", "html"), /role="progressbar"[\s\S]*<svg/);
  assert.match(code("progress-ring", "react", "jsx"), /aria-valuenow=\{value\}[\s\S]*setValue/);
  assert.match(code("scrim", "vanilla", "html"), /<dialog class="scrim-dialog"/);
  assert.match(code("scrim", "vanilla", "css"), /::backdrop/);
  assert.match(code("scrim", "react", "jsx"), /showModal/);
  assert.match(code("scrim", "react", "jsx"), /<dialog[\s\S]*onClose/);
  assert.match(code("divider", "vanilla", "html"), /<hr>/);
  assert.match(code("divider", "react", "jsx"), /<hr\s*\/>/);

  assert.match(code("tabs", "vanilla", "js"), /ArrowRight[\s\S]*Home/);
  assert.match(code("tabs", "vanilla", "js"), /tabIndex/);
  assert.match(code("tabs", "react", "jsx"), /aria-controls/);
  assert.match(code("tabs", "react", "jsx"), /aria-labelledby/);
  assert.match(code("tabs", "react", "jsx"), /onKeyDown/);
  assert.match(code("dropdown-menu", "vanilla", "js"), /ArrowDown/);
  assert.match(code("dropdown-menu", "vanilla", "js"), /Escape/);
  assert.match(code("dropdown-menu", "vanilla", "js"), /trigger\.focus/);
  assert.match(code("overflow-menu", "react", "jsx"), /choose\(action\)[\s\S]*role="menuitem"/);
  assert.match(code("tree-view", "vanilla", "html"), /button[^>]*role="treeitem"[\s\S]*role="group"/);
  assert.match(code("tree-view", "vanilla", "js"), /ArrowRight[\s\S]*ArrowLeft/);
  assert.match(code("tree-view", "vanilla", "js"), /focusItem/);
  assert.match(code("tree-view", "react", "jsx"), /tabIndex[\s\S]*onKeyDown[\s\S]*aria-selected/);
});

test("DemoRegistry covers the same 90 slugs as the catalog", async () => {
  const { catalog } = await loadCatalogModule();
  const source = await readFile(new URL("../app/ui/DemoStage.tsx", import.meta.url), "utf8");
  const start = source.indexOf("export const demoSlugs = [");
  const end = source.indexOf("] as const;", start);
  assert.ok(start >= 0 && end > start, "demoSlugs registry was not found");
  const slugs = [...source.slice(start, end).matchAll(/"([a-z0-9-]+)"/g)].map(
    (match) => match[1],
  );
  assert.equal(slugs.length, 90);
  assert.deepEqual(
    slugs.slice().sort(),
    catalog.map((item) => item.slug).slice().sort(),
  );
});

test("all AI prompts are concise and implementation-ready", async () => {
  const { catalog } = await loadCatalogModule();
  let promptsWithinFiftyCharacters = 0;
  for (const item of catalog) {
    assert.doesNotMatch(item.aiPrompt, /不要依赖第三方组件库/);
    assert.doesNotMatch(item.aiPrompt, /请给出可直接运行的组件与必要样式/);
    assert.ok(item.aiPrompt.includes(item.name.zh), `${item.slug} prompt omits Chinese name`);
    assert.ok(item.aiPrompt.includes(item.name.en), `${item.slug} prompt omits English name`);
    assert.ok(item.aiPrompt.includes(item.summary.zh), `${item.slug} prompt omits summary`);
    assert.ok([...item.aiPrompt].length <= 100, `${item.slug} prompt exceeds 100 characters`);
    if ([...item.aiPrompt].length <= 50) promptsWithinFiftyCharacters += 1;
  }
  assert.ok(promptsWithinFiftyCharacters >= 60);
});
