import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const demoUrl = new URL("../app/ui/DemoStage.tsx", import.meta.url);
const cssUrl = new URL("../app/ui/demo-stage.css", import.meta.url);
const configUrl = new URL("../app/ui/demo-config.ts", import.meta.url);

function attributeNames(node) {
  return new Set(
    node.attributes.properties
      .filter(ts.isJsxAttribute)
      .map((attribute) => attribute.name.text),
  );
}

test("every demo button has an activation handler", async () => {
  const source = await readFile(demoUrl, "utf8");
  const file = ts.createSourceFile("DemoStage.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const unwired = [];

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (node.tagName.getText(file) === "button") {
        const attributes = attributeNames(node);
        if (!["onClick", "onContextMenu"].some((name) => attributes.has(name))) {
          const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
          unwired.push(line + 1);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(file);
  assert.deepEqual(unwired, [], `unwired demo buttons at lines: ${unwired.join(", ")}`);
});

test("every range control updates state", async () => {
  const source = await readFile(demoUrl, "utf8");
  const file = ts.createSourceFile("DemoStage.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const unwired = [];

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (node.tagName.getText(file) === "input") {
        const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
        const type = attributes.find((attribute) => attribute.name.text === "type");
        const isRange = type?.initializer && ts.isStringLiteral(type.initializer) && type.initializer.text === "range";
        if (isRange && !attributeNames(node).has("onChange")) {
          const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
          unwired.push(line + 1);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(file);
  assert.deepEqual(unwired, [], `unwired range inputs at lines: ${unwired.join(", ")}`);
});

test("slug-specific demos start with a valid selected item", async () => {
  const source = await readFile(demoUrl, "utf8");
  assert.match(source, /const initialActive = slug === "breadcrumb" \? "滑块" : slug === "anchor-navigation" \? "简介" : slug === "split-view" \? "收件箱" : labels\[0\];/);
  assert.match(source, /useState\(slug === "segmented-control" \? "卡片" : "自动"\)/);
});

test("combobox closes on focus exit and preserves input focus for pointer selection", async () => {
  const source = await readFile(demoUrl, "utf8");
  const section = source.slice(
    source.indexOf('case "combobox"'),
    source.indexOf('case "segmented-control"'),
  );
  assert.match(section, /onBlur=.*setComboOpen\(false\)/);
  assert.match(section, /onMouseDown=\{\(event\) => event\.preventDefault\(\)\}/);
});

test("file upload enforces its advertised type and size limits", async () => {
  const source = await readFile(demoUrl, "utf8");
  assert.match(source, /\["image\/png", "image\/jpeg"\]\.includes\(file\.type\)/);
  assert.match(source, /file\.size > 10 \* 1024 \* 1024/);
  assert.match(source, /文件不能超过 10 MB/);
  const upload = source.slice(
    source.indexOf('case "file-upload"'),
    source.indexOf("default:", source.indexOf('case "file-upload"')),
  );
  assert.match(upload, /<input accept="image\/png,image\/jpeg" hidden/);
  assert.doesNotMatch(upload, /className="sr-only"[^>]*type="file"/);
});

test("data grid and calendar keep keyboard movement inside valid cells", async () => {
  const source = await readFile(demoUrl, "utf8");
  const gridHandler = source.slice(
    source.indexOf("const handleGridKeyDown"),
    source.indexOf("const handleTreeKeyDown"),
  );
  assert.match(gridHandler, /const row = Math\.floor\(position \/ 3\)/);
  assert.match(gridHandler, /const column = position % 3/);
  assert.match(gridHandler, /event\.currentTarget\.closest\("\.demo-data-grid"\)/);
  assert.doesNotMatch(gridHandler, /ArrowLeft: Math\.max\(3, index - 1\)/);
  assert.ok(gridHandler.indexOf("event.preventDefault();") < gridHandler.indexOf("if (next === index) return;"));

  const calendarHandler = source.slice(
    source.indexOf("const handleCalendarKeyDown"),
    source.indexOf("switch (slug)", source.indexOf("const handleCalendarKeyDown")),
  );
  assert.match(calendarHandler, /const next = day \+ offset;/);
  assert.match(calendarHandler, /if \(next < 7 \|\| next > 20\) return;/);
  assert.doesNotMatch(calendarHandler, /Math\.max\(7, Math\.min\(20/);
  assert.ok(calendarHandler.indexOf("event.preventDefault();") < calendarHandler.indexOf("if (next < 7 || next > 20) return;"));
});

test("tooltip, sortable, and narrow demos keep accessible interaction contracts", async () => {
  const [source, css] = await Promise.all([
    readFile(demoUrl, "utf8"),
    readFile(cssUrl, "utf8"),
  ]);
  const tooltip = source.slice(
    source.indexOf('case "tooltip"'),
    source.indexOf('case "hover-card"'),
  );
  assert.match(tooltip, /aria-label="查看术语解释"/);
  assert.match(tooltip, /setTooltipHovered/);
  assert.match(tooltip, /setTooltipFocusWithin/);

  const sortable = source.slice(
    source.indexOf('case "drag-and-drop"'),
    source.indexOf('case "infinite-scroll"'),
  );
  assert.match(sortable, /aria-live="polite"/);
  assert.match(source, /setSortAnnouncement\(`\$\{items\[(?:index|from)\]\} 已移至第 \$\{(?:nextIndex|to) \+ 1\} 项`\)/);

  const narrow = css.slice(css.indexOf("@container (max-width: 360px)"));
  assert.match(narrow, /\.demo-color-picker\s*\{[\s\S]*?flex-wrap:\s*wrap;/);
  assert.match(narrow, /\.demo-color-presets\s*\{[\s\S]*?flex-basis:\s*100%;/);
  assert.match(css, /\.demo-calendar-grid\s*\{[^}]*overflow-x:\s*auto;/);
  assert.match(css, /\.demo-calendar-row\s*\{[^}]*minmax\(44px,\s*1fr\)[^}]*min-width:\s*326px;/);
});

test("annotation guides use a complete explicit registry without semantic guessing", async () => {
  const config = await readFile(configUrl, "utf8");
  assert.match(config, /satisfies Record<DemoSlug,/);
  assert.doesNotMatch(config, /function semanticSelector/);
  assert.doesNotMatch(config, /semanticSelector\(label\)/);
});

test("annotation targets describe real semantic parts instead of proxy geometry", async () => {
  const [config, demo, styles] = await Promise.all([
    readFile(configUrl, "utf8"),
    readFile(demoUrl, "utf8"),
    readFile(cssUrl, "utf8"),
  ]);

  assert.match(config, /checkbox: parts\(\s*"\.demo-check-box",\s*"\.demo-check-mark",\s*"\.demo-check-label"/s);
  assert.match(demo, /className="demo-check-box"[\s\S]*className="demo-check-mark"[\s\S]*className="demo-check-label"/);
  assert.doesNotMatch(styles, /\.demo-check-mark\s*\{[^}]*margin-left:\s*-30px/s);

  assert.match(config, /"range-slider": parts\(\s*"\.demo-dual-range-track",\s*"\.demo-dual-range-thumb\.is-low",\s*"\.demo-dual-range-thumb\.is-high"/s);
  assert.match(demo, /className="demo-dual-range-thumb is-low"[\s\S]*className="demo-dual-range-thumb is-high"/);

  assert.match(config, /scrim: parts\(\s*"\.demo-scrim-layer",\s*"\.demo-overlay-scene > \.demo-primary",\s*"\.demo-scrim-card"/s);
  assert.match(config, /"data-grid": parts\(\s*"\.demo-data-grid-title",\s*"\.demo-data-grid-row\.is-active-row",\s*'\.demo-data-grid \[role="gridcell"\]\[tabindex="0"\]'/s);
  assert.match(demo, /className="demo-data-grid-title"[\s\S]*aria-labelledby=\{gridTitleId\}/);

  assert.match(config, /"image-gallery": parts\(\s*"\.demo-gallery",\s*"\.demo-gallery > div:last-child > button",\s*"\.demo-gallery-caption"/s);
  assert.match(demo, /<figcaption className="demo-gallery-caption">/);

  assert.match(config, /"bottom-navigation": parts\(\s*"\.demo-bottom-nav",\s*"\.demo-bottom-nav \.demo-icon",\s*"\.demo-bottom-nav \.demo-nav-label"/s);
  assert.match(config, /"navigation-bar": parts\(\s*"\.demo-navbar > strong",\s*"\.demo-navbar > \.demo-nav-list > button"/s);
  assert.match(config, /"sidebar-navigation": parts\([\s\S]*"\.demo-sidebar-layout \.demo-nav-list > button"/);
  assert.match(config, /"search-field": parts\(\s*"\.demo-search-box",\s*"\.demo-search-box > input",\s*"\.demo-search-box > button"/s);
  assert.match(config, /"tags-input": parts\(\s*"\.demo-tags-box > \.demo-tag",\s*"\.demo-tags-box > input",\s*"\.demo-tag > button"/s);
  assert.match(config, /avatar: parts\(\s*"\.demo-avatar-initials",\s*"\.demo-avatar-large",\s*"\.demo-avatar-status"/s);
  assert.match(demo, /className="demo-tag"[\s\S]*className="demo-tag-label"[\s\S]*aria-label=\{`移除 \$\{tag\}`\}/);
  assert.match(config, /timeline: parts\(\s*"\.demo-timeline-marker",\s*"\.demo-timeline-connector",\s*"\.demo-timeline-content"/s);
  assert.match(config, /toolbar: parts\([\s\S]*"\.demo-toolbar > span:not\(\.demo-status\)"/);
  assert.match(config, /"lazy-loading": parts\(\s*"\.demo-lazy-slot",\s*"\.demo-lazy > button",\s*"\.demo-lazy-content"/s);
});

test("marquee separates its accessible copy and pauses for pointer or focus", async () => {
  const source = await readFile(demoUrl, "utf8");
  const marquee = source.slice(
    source.indexOf('case "marquee"'),
    source.indexOf('case "parallax-scrolling"'),
  );
  assert.match(marquee, /aria-hidden="true"/);
  assert.match(marquee, /setMarqueeHovered/);
  assert.match(marquee, /setMarqueeFocusWithin/);
  assert.match(source, /paused \|\| marqueeHovered \|\| marqueeFocusWithin/);
});

test("six added demos are registered, routed explicitly, and keyboard accessible", async () => {
  const [source, css] = await Promise.all([
    readFile(demoUrl, "utf8"),
    readFile(cssUrl, "utf8"),
  ]);
  const slugBlock = source.slice(source.indexOf("export const demoSlugs"), source.indexOf("] as const;"));
  assert.equal((slugBlock.match(/^\s+"[a-z-]+",$/gm) ?? []).length, 90);
  for (const slug of ["split-view", "command-palette", "focus-ring", "progress-ring", "scrim", "divider"]) {
    assert.match(source, new RegExp(`case "${slug}"`));
    assert.match(source, new RegExp(`(?:"${slug}"|${slug}): entry\\("${slug}"\\)`));
  }
  assert.doesNotMatch(source, /new Set<DemoSlug>\(demoSlugs\.slice/);

  const split = source.slice(source.indexOf('case "split-view"'), source.indexOf("default:", source.indexOf('case "split-view"')));
  assert.match(split, /role="separator"/);
  assert.match(split, /aria-valuenow=\{splitPosition\}/);
  assert.match(split, /onPointerMove=/);
  assert.match(split, /event\.key === "ArrowLeft"/);

  const command = source.slice(source.indexOf('case "command-palette"'), source.indexOf("default:", source.indexOf('case "command-palette"')));
  assert.match(command, /role="dialog"/);
  assert.match(command, /role="combobox"/);
  assert.match(command, /role="listbox"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.metaKey \|\| event\.ctrlKey/);

  const progressRing = source.slice(source.indexOf('case "progress-ring"'), source.indexOf("default:", source.indexOf('case "progress-ring"')));
  assert.match(progressRing, /role="progressbar"/);
  assert.match(progressRing, /aria-valuenow=\{progress\}/);
  assert.match(source, /case "focus-ring"[\s\S]*?aria-pressed=\{focusTarget === index\}/);
  assert.match(source, /case "scrim"[\s\S]*?aria-modal=\{density === "detail" && modalEngaged \? true : undefined\}[\s\S]*?role="dialog"/);
  assert.match(source, /case "divider"[\s\S]*?aria-orientation=\{vertical \? "vertical" : "horizontal"\}[\s\S]*?role="separator"/);

  for (const selector of ["demo-split-view", "demo-command-dialog", "demo-focus-ring", "demo-progress-ring", "demo-scrim-layer", "demo-divider-example"]) {
    assert.match(css, new RegExp(`\\.${selector}`));
  }
});

test("audited demos expose complete content and interaction behavior", async () => {
  const [source, css] = await Promise.all([
    readFile(demoUrl, "utf8"),
    readFile(cssUrl, "utf8"),
  ]);

  const navigationBar = source.slice(source.indexOf('case "navigation-bar"'), source.indexOf('case "sidebar-navigation"'));
  assert.match(navigationBar, /aria-label="全局搜索"/);
  assert.match(navigationBar, /aria-label="账户菜单"/);
  assert.match(navigationBar, /setGlobalActionStatus\("已打开全局搜索"\)/);
  assert.doesNotMatch(navigationBar, /setActive\("(?:全局搜索|账户)"\)/);
  const drawer = source.slice(source.indexOf('case "navigation-drawer"'), source.indexOf('case "bottom-navigation"'));
  assert.match(drawer, /className="demo-drawer-scrim"/);
  assert.match(drawer, /onClick=\{closeDrawer\}/);
  assert.match(drawer, /tabIndex=\{-1\}/);
  assert.match(drawer, /onKeyDown=\{handleDrawerKeyDown\}/);
  const drawerControls = source.slice(source.indexOf("const closeDrawer"), source.indexOf("const handleDrawerKeyDown"));
  assert.match(drawerControls, /const closeDrawer = \(\) =>/);
  assert.match(drawerControls, /drawerOpened\.current = true/);
  assert.match(drawerControls, /setDrawerOpen\(false\)/);
  const drawerKeyboard = source.slice(source.indexOf("const handleDrawerKeyDown"), source.indexOf("switch (slug)", source.indexOf("const handleDrawerKeyDown")));
  assert.match(drawerKeyboard, /event\.key !== "Tab"/);
  assert.match(drawerKeyboard, /drawerRef\.current\.contains\(activeElement\)/);
  assert.match(drawerKeyboard, /event\.shiftKey \? last : first/);

  const anchor = source.slice(source.indexOf('case "anchor-navigation"'), source.indexOf('case "split-view"'));
  assert.match(anchor, /href=\{`#\$\{sectionId\}`\}/);
  assert.match(source, /const anchorId = \(index: number\) => id\(`anchor-\$\{density\}-\$\{index\}`\)/);
  assert.match(anchor, /id=\{anchorId\(index\)\}/);
  assert.match(anchor, /anchorContentRef\.current\.scrollTo/);
  assert.match(anchor, /onScroll=/);

  assert.match(source, /slug === "split-button" \? \["立即发布", "定时发布", "存为草稿"\]/);
  assert.match(source, /if \(slug === "split-button"\) setCount\(0\);/);
  assert.match(source, /window\.setTimeout\(\(\) => setVisible\(false\), 3600\)/);
  const toast = source.slice(source.indexOf('case "toast"'), source.indexOf('case "snackbar"'));
  assert.match(source, /!visible \|\| toastHovered \|\| toastFocusWithin/);
  assert.match(toast, /onPointerEnter=\{\(\) => setToastHovered\(true\)\}/);
  assert.match(toast, /onPointerLeave=\{\(\) => setToastHovered\(false\)\}/);
  assert.match(toast, /onFocusCapture=\{\(\) => setToastFocusWithin\(true\)\}/);
  assert.match(toast, /setToastFocusWithin\(false\)/);

  const hoverCard = source.slice(source.indexOf('case "hover-card"'), source.indexOf('case "side-sheet"'));
  assert.match(hoverCard, /<a[^>]*href="#design-system-profile"/);
  assert.match(hoverCard, /event\.preventDefault\(\)/);
  assert.match(hoverCard, /收录常用交互组件/);

  const lightbox = source.slice(source.indexOf('case "lightbox"'), source.indexOf("default:", source.indexOf('case "lightbox"')));
  assert.match(source, /const lightboxItems = \["界面总览", "组件细节", "移动端预览"\]/);
  assert.match(lightbox, /aria-label="上一张"/);
  assert.match(lightbox, /aria-label="下一张"/);
  assert.match(lightbox, /\{lightboxIndex \+ 1\} \/ \{lightboxItems\.length\}/);

  for (const section of [
    source.slice(source.indexOf('case "scrim"'), source.indexOf('case "dialog"')),
    source.slice(source.indexOf('case "dialog"'), source.indexOf('case "alert-dialog"')),
    source.slice(source.indexOf('case "alert-dialog"'), source.indexOf('case "popover"')),
    lightbox,
  ]) {
    assert.match(section, /aria-modal=\{density === "detail" && modalEngaged \? true : undefined\}/);
    assert.doesNotMatch(section, /aria-modal="true"/);
  }

  const calendar = source.slice(source.indexOf('case "calendar-view"'), source.indexOf('case "chart"'));
  assert.match(source, /const calendarEvents: Record<number, string> = \{ 10: "设计评审", 14: "发布检查", 18: "团队同步" \}/);
  assert.match(calendar, /className="demo-calendar-event-dot"/);
  assert.match(calendar, /calendarEvents\[selectedDay\] \?\? "无日程"/);

  const parallax = source.slice(source.indexOf('case "parallax-scrolling"'), source.indexOf('case "scroll-snap"'));
  assert.match(parallax, /className="demo-parallax-scroll"/);
  assert.match(parallax, /onScroll=/);
  assert.match(parallax, /scrollTop \/ maxScroll/);
  assert.doesNotMatch(parallax, /type="range"/);
  assert.match(css, /prefers-reduced-motion:[\s\S]*?\.demo-parallax \.demo-orb,[\s\S]*?transform: none !important;/);
});

test("each demo stage scopes interactive ids to its React instance", async () => {
  const source = await readFile(demoUrl, "utf8");
  assert.match(source, /const instanceId = `demo-\$\{useId\(\)\.replace\(\/:\/g, ""\)\}`/);
  assert.match(source, /<DemoIdContext\.Provider value=\{instanceId\}>/);
  assert.match(source, /const id = useDemoId\(\)/);
  assert.doesNotMatch(source, /aria-(?:controls|describedby|labelledby|activedescendant)="[^"]+"/);
  assert.doesNotMatch(source, /id="(?:navigation-drawer|command-|url-hint|dialog-title|alert-title|tooltip-content|truncated-copy)/);
});

test("accordion always shows three single-open semantic headings", async () => {
  const [source, css] = await Promise.all([
    readFile(demoUrl, "utf8"),
    readFile(cssUrl, "utf8"),
  ]);
  const accordion = source.slice(source.indexOf('case "accordion"'), source.indexOf('case "disclosure"'));
  for (const label of ["什么是 Slider？", "何时使用？", "键盘如何操作？"]) assert.ok(accordion.includes(label));
  assert.match(accordion, /<h3><button aria-controls=\{panelId\} aria-expanded=\{expanded\}/);
  assert.match(accordion, /className="demo-accordion-panel"/);
  assert.match(source, /setOpenAccordionIndex\(\(current\) => current === index \? null : index\)/);
  assert.doesNotMatch(accordion, /\.slice\(/);
  assert.match(css, /\.demo-accordion-panel \{ animation: demo-accordion-reveal var\(--demo-motion-fast\) ease-out; \}/);
});

test("tree expansion and ARIA grids follow their keyboard structures", async () => {
  const source = await readFile(demoUrl, "utf8");
  assert.match(source, /event\.key === "ArrowRight" && index === 0 && !expanded/);

  const dataGrid = source.slice(
    source.indexOf('case "data-grid"'),
    source.indexOf('case "tree-view"'),
  );
  assert.match(dataGrid, /className="demo-data-grid-row"[^>]*role="row"/);
  assert.match(dataGrid, /role="columnheader"/);
  assert.match(dataGrid, /role="gridcell"/);

  const calendar = source.slice(
    source.indexOf('case "calendar-view"'),
    source.indexOf('case "chart"'),
  );
  assert.match(calendar, /className="demo-calendar-row"[^>]*role="row"/);
  assert.match(calendar, /aria-selected=\{selectedDay === day\}/);
  assert.match(calendar, /role="gridcell"/);
});

test("before-after slider uses a horizontal full-area control", async () => {
  const [source, css] = await Promise.all([
    readFile(demoUrl, "utf8"),
    readFile(cssUrl, "utf8"),
  ]);
  assert.match(source, /className="demo-compare-control"/);
  assert.match(source, /className="demo-compare-line"/);
  assert.match(source, /className="demo-compare-handle"/);
  assert.match(css, /\.demo-compare-control\s*\{[\s\S]*?inset:\s*0;/);
  const componentSection = source.slice(
    source.indexOf('case "before-after-slider"'),
    source.indexOf("default:", source.indexOf('case "before-after-slider"')),
  );
  assert.match(componentSection, /max="100"/);
  assert.match(componentSection, /min="0"/);
  assert.doesNotMatch(componentSection, /max="92"|min="8"/);
  assert.equal(componentSection.split('style={{ left: `${compare}%` }}').length - 1, 2);
  const section = css.slice(
    css.indexOf(".demo-stage .demo-before-after"),
    css.indexOf(".demo-stage .demo-unavailable"),
  );
  assert.doesNotMatch(section, /rotate\(90deg\)/);
  assert.doesNotMatch(section, /\.demo-before\s*\{[\s\S]*?border-right:/);
  assert.match(section, /\.demo-before\s*\{[\s\S]*?padding:\s*0;/);
  assert.match(section, /\.demo-compare-control input\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;/);
  assert.match(section, /\.demo-compare-line\s*\{[\s\S]*?width:\s*2px;[\s\S]*?transform:\s*translateX\(-50%\);/);
  assert.match(section, /\.demo-compare-handle\s*\{[\s\S]*?width:\s*34px;[\s\S]*?height:\s*34px;/);
});

test("visible scroll areas use the dark scrollbar treatment", async () => {
  const [globalCss, codeCss, demoCss] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/code-explorer.css", import.meta.url), "utf8"),
    readFile(cssUrl, "utf8"),
  ]);
  assert.match(globalCss, /html\s*\{[\s\S]*?scrollbar-width:\s*thin;/);
  assert.match(globalCss, /html::\-webkit-scrollbar-thumb/);
  assert.match(codeCss, /\.code-panel\s*\{[\s\S]*?scrollbar-color:/);
  assert.match(codeCss, /\.code-panel::\-webkit-scrollbar-corner/);
  assert.match(demoCss, /\.demo-table-scroll,[\s\S]*?\.demo-feed > div,[\s\S]*?\.demo-snap > div:first-child\s*\{[\s\S]*?scrollbar-width:\s*thin;/);
});

test("usage guidance renders a complete two-column grid", async () => {
  const source = await readFile(new URL("../app/components/[slug]/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /info-panel-wide/);
  assert.equal((source.match(/className="info-panel"/g) ?? []).length, 4);
});

test("detail copy actions use the shared top-right icon treatment", async () => {
  const [promptSource, codeSource, globalCss, codeCss] = await Promise.all([
    readFile(new URL("../app/ui/InteractiveDetail.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/CodeExplorer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/code-explorer.css", import.meta.url), "utf8"),
  ]);
  assert.match(promptSource, /className="copy-icon-button"/);
  assert.match(codeSource, /className="copy-code copy-icon-button"/);
  assert.match(globalCss, /\.prompt-box \.copy-icon-button\s*\{[\s\S]*?position:\s*absolute;/);
  assert.match(codeCss, /\.copy-code\s*\{[\s\S]*?position:\s*absolute;/);
});

test("detail preview only sticks when the viewport can contain the full lab", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.detail-visual\s*\{\s*align-self:\s*stretch;/);
  assert.match(css, /\.detail-visual-sticky\s*\{\s*position:\s*static;/);
  assert.match(css, /@media \(min-width:\s*981px\) and \(min-height:\s*980px\)[\s\S]*?\.detail-visual-sticky\s*\{[\s\S]*?position:\s*sticky;/);
  assert.match(css, /@media \(max-width:\s*980px\)[\s\S]*?\.detail-visual-sticky\s*\{\s*position:\s*static;/);
});

test("detail lab links anatomy markers, explanations, and live controls", async () => {
  const [source, config, css, demoStage] = await Promise.all([
    readFile(new URL("../app/ui/InteractiveDetail.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/demo-config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/interactive-detail.css", import.meta.url), "utf8"),
    readFile(new URL("../app/ui/DemoStage.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(source, /getAnnotationGuides\(slug, anatomy\)/);
  assert.match(source, /data-demo-part="\$\{guide\.id\}"/);
  assert.doesNotMatch(source, /target\.addEventListener\("pointerenter", enter\)/);
  assert.doesNotMatch(source, /target\.addEventListener\("focusin", enter\)/);
  assert.match(source, /const activePart = hoveredPart \?\? focusedPart/);
  assert.match(source, /event\.pointerType !== "touch"/);
  assert.match(source, /window\.addEventListener\("keydown", noteKeyboardInput, true\)/);
  assert.match(source, /window\.addEventListener\("pointerdown", notePointerInput, true\)/);
  assert.match(source, /if \(keyboardInputRef\.current\) setFocusedPart\(guide\.id\)/);
  assert.match(source, /onPointerDown=\{\(\) => setFocusedPart\(null\)\}/);
  assert.doesNotMatch(source, /lockedPart/);
  assert.doesNotMatch(source, /aria-pressed=\{lockedPart/);
  assert.match(source, /new ResizeObserver\(scheduleMeasure\)/);
  assert.match(source, /new MutationObserver\(scheduleMeasure\)/);
  assert.match(source, /stage\.addEventListener\("animationend", scheduleMeasure\)/);
  assert.match(source, /onSettingChange=\{updateSettingFromDemo\}/);
  assert.match(source, /delete next\[key\]/);
  assert.match(source, /controls\.length === 0/);
  assert.doesNotMatch(source, /data-backdrop=/);
  assert.match(source, /resolveMarkerCollisions/);
  assert.doesNotMatch(source, /fallbackTargets/);
  assert.doesNotMatch(config, /function semanticSelector\(label: string\)/);
  assert.doesNotMatch(config, /universalControls/);
  assert.doesNotMatch(config, /key: "backdrop"/);
  assert.doesNotMatch(config, /key: "accent"/);
  assert.doesNotMatch(config, /key: "radius"/);
  assert.doesNotMatch(config, /key: "controlSize"/);
  assert.doesNotMatch(config, /key: "motionMs"/);
  assert.match(config, /"date-picker": \[[\s\S]*?key: "weekStartsOn"[\s\S]*?key: "cellSize"[\s\S]*?key: "showWeekNumbers"/);
  assert.match(config, /"before-after-slider": \[[\s\S]*?key: "compare"/);
  assert.match(config, /return componentControls\[slug\] \?\? \[\]/);
  assert.match(config, /"progress-stepper": \[[\s\S]*?\.demo-stepper li button > span[\s\S]*?\.demo-stepper-connector/);
  assert.match(config, /"focus-ring": \[[\s\S]*?\.demo-focus-surface button[\s\S]*?\.demo-focus-outline[\s\S]*?\.demo-focus-surface/);
  assert.match(demoStage, /"--demo-marquee-duration": `\$\{settings\?\.marqueeDuration \?\? 12_000\}ms`/);
  assert.match(css, /\.demo-annotation-marker\[data-active="true"\]/);
  assert.match(css, /--annotation-rail:/);
  assert.doesNotMatch(css, /\.demo-annotation-marker > em/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("date picker exposes editable input, trigger, and keyboard calendar grid", async () => {
  const source = await readFile(new URL("../app/ui/DatePickerDemo.tsx", import.meta.url), "utf8");
  assert.equal((source.match(/data-demo-part="[123]"/g) ?? []).length, 3);
  assert.match(source, /type="date"/);
  assert.match(source, /aria-haspopup="dialog"/);
  assert.match(source, /role="grid"/);
  assert.match(source, /case "ArrowLeft"/);
  assert.match(source, /case "PageDown"/);
  assert.match(source, /case "Escape"/);
  assert.match(source, /requestAnimationFrame\(\(\) => triggerRef\.current\?\.focus\(\)\)/);
});
