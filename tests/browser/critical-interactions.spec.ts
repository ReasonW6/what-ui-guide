import { expect, test, type Locator, type Page } from "@playwright/test";
import { catalog } from "../../lib/catalog";

const browserErrors = new WeakMap<Page, string[]>();
const expectedIdentificationAbort = new WeakSet<Page>();

const identificationResult = {
  status: "identified",
  summary: "这个界面最接近选项卡。",
  basis: "public_web",
  candidates: [{
    slug: "tabs",
    confidence: "high",
    evidence: ["存在并列标签和单一活动面板"],
    distinction: "它用于切换同层内容。",
    implementation: {
      anatomy: ["标签列表", "标签", "内容面板"],
      behavior: ["选择标签后显示对应面板"],
      styling: ["活动标签具有清晰状态"],
      accessibility: ["使用 tablist、tab 与 tabpanel 语义"],
    },
    name: { zh: "选项卡", en: "Tabs" },
    summary: { zh: "在同一页面区域切换同层内容。", en: "Switch peer content in place." },
    aliases: [],
    platforms: ["web"],
    anatomy: ["标签列表", "内容面板"],
    useWhen: ["同层内容需要切换"],
    avoidWhen: [],
    accessibility: ["支持方向键导航"],
    aiPrompt: "实现一组可访问的选项卡。",
    confusionGuide: null,
    code: {
      vanilla: [{ name: "index.html", language: "html", code: "<div role=\"tablist\"></div>" }],
      react: [{ name: "Tabs.jsx", language: "jsx", code: "export function Tabs() { return null; }" }],
    },
  }],
  uncertainties: [],
  followUpQuestion: null,
  notices: [],
  sourceUrl: "https://example.com/",
  sourcePreview: null,
  sources: [],
};

const identificationCapabilities = {
  acceptedImageTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  managedAi: true,
  maxImageBytes: 8 * 1024 * 1024,
  visualWebpageCapture: false,
};

async function mockIdentificationApi(page: Page) {
  await page.route("**/api/identify", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        route.request().method() === "GET" ? identificationCapabilities : identificationResult,
      ),
    });
  });
}

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await page.locator('[data-hydrated="true"]').first().waitFor();
}

async function rect(locator: Locator) {
  return locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { bottom: box.bottom, left: box.left, right: box.right, top: box.top };
  });
}

async function unionRect(locator: Locator) {
  return locator.evaluateAll((elements) => {
    const boxes = elements.map((element) => element.getBoundingClientRect());
    return {
      bottom: Math.max(...boxes.map((box) => box.bottom)),
      left: Math.min(...boxes.map((box) => box.left)),
      right: Math.max(...boxes.map((box) => box.right)),
      top: Math.min(...boxes.map((box) => box.top)),
    };
  });
}

async function annotationEdgeDelta(
  preview: Locator,
  part: number,
  target: Locator,
  targetIsUnion = false,
) {
  const [actual, expected] = await Promise.all([
    rect(preview.locator(`.demo-annotation-highlight[data-annotation-part="${part}"]`)),
    targetIsUnion ? unionRect(target) : rect(target),
  ]);
  return Math.max(
    Math.abs(actual.top - expected.top),
    Math.abs(actual.right - expected.right),
    Math.abs(actual.bottom - expected.bottom),
    Math.abs(actual.left - expected.left),
  );
}

function expectEdgesToMatch(
  actual: Awaited<ReturnType<typeof rect>>,
  expected: Awaited<ReturnType<typeof rect>>,
  edges: Array<keyof Awaited<ReturnType<typeof rect>>>,
) {
  for (const edge of edges) {
    expect(Math.abs(actual[edge] - expected[edge]), `${edge} edge`).toBeLessThanOrEqual(2);
  }
}

function expectContained(
  inner: Awaited<ReturnType<typeof rect>>,
  outer: Awaited<ReturnType<typeof rect>>,
) {
  expect(inner.top).toBeGreaterThanOrEqual(outer.top - 2);
  expect(inner.right).toBeLessThanOrEqual(outer.right + 2);
  expect(inner.bottom).toBeLessThanOrEqual(outer.bottom + 2);
  expect(inner.left).toBeGreaterThanOrEqual(outer.left - 2);
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("requestfailed", (request) => {
    if (
      expectedIdentificationAbort.has(page)
      && new URL(request.url()).pathname === "/api/identify"
      && request.failure()?.errorText.includes("ABORTED")
    ) return;
    errors.push(`request: ${request.url()} (${request.failure()?.errorText})`);
  });
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? [], "unexpected browser errors").toEqual([]);
});

test("production start serves every linked build asset", async ({ page, request }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon.svg");

  const assetUrls = await page.locator('link[href], script[src]').evaluateAll((elements) => (
    [...new Set(elements.map((element) => (
      element instanceof HTMLLinkElement ? element.href : (element as HTMLScriptElement).src
    )))].filter((url) => new URL(url).pathname.startsWith("/assets/"))
  ));
  expect(assetUrls.length).toBeGreaterThan(0);

  for (const url of assetUrls) {
    const asset = await request.get(url);
    expect(asset.status(), url).toBe(200);
    if (new URL(url).pathname.endsWith(".css")) {
      expect(asset.headers()["content-type"], url).toContain("text/css");
    }
  }
});

test("dialog and drawer constrain focus and restore it on close", async ({ page }) => {
  await gotoReady(page, "/components/dialog");
  const dialogDemo = page.locator(".detail-demo-canvas");
  const dialogTrigger = dialogDemo.getByRole("button", { name: "编辑资料" });

  await dialogTrigger.click();
  const dialog = dialogDemo.getByRole("dialog", { name: "编辑资料" });
  await expect(dialog.getByRole("textbox", { name: "显示名称" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "保存" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(dialogTrigger).toBeFocused();

  await gotoReady(page, "/components/navigation-drawer");
  const drawerDemo = page.locator(".detail-demo-canvas");
  const drawerTrigger = drawerDemo.getByRole("button", { name: "打开导航抽屉" });

  await drawerTrigger.click();
  const drawer = drawerDemo.getByRole("dialog", { name: "浏览" });
  await expect(drawer.getByRole("button", { name: "关闭导航抽屉" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(drawer.getByRole("button", { name: "资源" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(drawerTrigger).toBeFocused();
});

test("edge overlays use the full demo viewport", async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await gotoReady(page, "/components/side-sheet");
    const stage = page.locator(".demo-stage--detail");
    const sheetTrigger = stage.getByRole("button", { name: "打开设置" });
    await sheetTrigger.click();
    const sheet = stage.getByRole("dialog", { name: "页面设置" });
    await expect.poll(async () => {
      const sheetBox = await rect(sheet);
      const stageBox = await rect(stage);
      return Math.max(
        Math.abs(sheetBox.top - stageBox.top),
        Math.abs(sheetBox.right - stageBox.right),
        Math.abs(sheetBox.bottom - stageBox.bottom),
      );
    }).toBeLessThanOrEqual(2);
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(sheetTrigger).toBeFocused();

    await gotoReady(page, "/components/navigation-drawer");
    const drawerStage = page.locator(".demo-stage--detail");
    await drawerStage.getByRole("button", { name: "打开导航抽屉" }).click();
    const drawer = drawerStage.getByRole("dialog", { name: "浏览" });
    await expect.poll(async () => {
      const drawerBox = await rect(drawer);
      const stageBox = await rect(drawerStage);
      return Math.max(
        Math.abs(drawerBox.left - stageBox.left),
        Math.abs(drawerBox.top - stageBox.top),
        Math.abs(drawerBox.bottom - stageBox.bottom),
      );
    }).toBeLessThanOrEqual(2);
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  for (const overlay of [
    { path: "/components/dialog", trigger: "编辑资料", selector: ".demo-backdrop" },
    { path: "/components/command-palette", trigger: /打开命令面板/, selector: ".demo-command-backdrop" },
    { path: "/components/lightbox", trigger: "打开三张组件预览", selector: ".demo-lightbox" },
    { path: "/components/scrim", trigger: "显示遮罩", selector: ".demo-scrim-layer" },
  ]) {
    await gotoReady(page, overlay.path);
    const stage = page.locator(".demo-stage--detail");
    await stage.getByRole("button", { name: overlay.trigger }).click();
    await expect.poll(async () => {
      const overlayBox = await rect(stage.locator(overlay.selector));
      const stageBox = await rect(stage);
      return Math.max(
        Math.abs(overlayBox.top - stageBox.top),
        Math.abs(overlayBox.right - stageBox.right),
        Math.abs(overlayBox.bottom - stageBox.bottom),
        Math.abs(overlayBox.left - stageBox.left),
      );
    }).toBeLessThanOrEqual(2);
  }

  await gotoReady(page, "/components/popover");
  const popoverStage = page.locator(".demo-stage--detail");
  const popoverTrigger = popoverStage.getByRole("button", { name: "查看详情" });
  await popoverTrigger.click();
  const popoverBox = await rect(popoverStage.locator(".demo-popover"));
  const popoverTriggerBox = await rect(popoverTrigger);
  expect(popoverBox.top - popoverTriggerBox.bottom).toBeGreaterThanOrEqual(8);
  expectContained(popoverBox, await rect(popoverStage));

  await gotoReady(page, "/");
  await page.getByRole("searchbox", { name: "描述你看到的东西" }).fill("popover");
  const popoverCard = page.locator('.demo-stage--card[data-demo-slug="popover"]');
  await expect(popoverCard).toBeVisible();
  expectContained(await rect(popoverCard.locator(".demo-popover")), await rect(popoverCard));

  await gotoReady(page, "/components/toast");
  const toastStage = page.locator(".demo-stage--detail");
  await toastStage.getByRole("button", { name: "显示提示" }).click();
  const toastBox = await rect(toastStage.locator(".demo-toast"));
  const toastStageBox = await rect(toastStage);
  expect(Math.abs(toastStageBox.right - toastBox.right - 13)).toBeLessThanOrEqual(2);
  await expect.poll(async () => {
    const settledToastBox = await rect(toastStage.locator(".demo-toast"));
    const settledStageBox = await rect(toastStage);
    return Math.abs(settledStageBox.bottom - settledToastBox.bottom - 13);
  }).toBeLessThanOrEqual(2);
});

test("command palette shortcut opens, navigates, executes, and restores focus", async ({ page }) => {
  await gotoReady(page, "/components/command-palette");
  const demo = page.locator(".detail-demo-canvas");
  const trigger = demo.getByRole("button", { name: /打开命令面板/ });

  await trigger.focus();
  await page.keyboard.press("Control+K");
  const dialog = demo.getByRole("dialog", { name: "快速操作" });
  const input = dialog.getByRole("combobox", { name: "搜索命令" });
  await expect(input).toBeFocused();
  const listbox = dialog.getByRole("listbox");
  const listboxId = await listbox.getAttribute("id");
  expect(listboxId).toBeTruthy();
  await expect(input).toHaveAttribute("aria-controls", listboxId!);

  await page.keyboard.press("ArrowDown");
  const activeOptionId = await dialog.getByRole("option", { name: "搜索组件" }).getAttribute("id");
  expect(activeOptionId).toBeTruthy();
  await expect(input).toHaveAttribute("aria-activedescendant", activeOptionId!);
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(demo.getByText("已执行：搜索组件")).toBeVisible();
  await expect(trigger).toBeFocused();
});

test("tabs, tree, and data grid perform keyboard navigation", async ({ page }) => {
  await gotoReady(page, "/components/tabs");
  const tabsDemo = page.locator(".detail-demo-canvas");
  const firstTab = tabsDemo.getByRole("tab", { name: "概览" });
  const secondTab = tabsDemo.getByRole("tab", { name: "组件" });
  await firstTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(secondTab).toBeFocused();
  await expect(secondTab).toHaveAttribute("aria-selected", "true");
  await expect(tabsDemo.getByRole("tabpanel")).toContainText("这里显示“组件”内容");

  await gotoReady(page, "/components/tree-view");
  const treeDemo = page.locator(".detail-demo-canvas");
  const firstChild = treeDemo.getByRole("treeitem", { name: "选择与取值" });
  const secondChild = treeDemo.getByRole("treeitem", { name: "反馈与状态" });
  const root = treeDemo.getByRole("treeitem", { name: "组件" });
  await firstChild.focus();
  await page.keyboard.press("ArrowDown");
  await expect(secondChild).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(root).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(root).toHaveAttribute("aria-expanded", "false");

  await gotoReady(page, "/components/data-grid");
  const gridDemo = page.locator(".detail-demo-canvas");
  const sliderCell = gridDemo.getByRole("gridcell", { name: "Slider" });
  const scoreCell = gridDemo.getByRole("gridcell", { name: "9.4" });
  const nextScoreCell = gridDemo.getByRole("gridcell", { name: "9.1" });
  const dialogCell = gridDemo.getByRole("gridcell", { name: "Dialog" });
  await sliderCell.focus();
  await page.keyboard.press("ArrowRight");
  await expect(scoreCell).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(nextScoreCell).toBeFocused();
  await page.keyboard.press("Home");
  await expect(dialogCell).toBeFocused();
});

test("detail lab links annotations and keeps customization bidirectional", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoReady(page, "/components/date-picker");

  const preview = page.locator(".detail-demo-preview");
  const markers = preview.locator(".demo-annotation-marker");
  await expect(markers).toHaveCount(3);
  const gridMarker = preview.getByRole("button", { name: "部件 3：日期网格" });
  const gridGuide = page.locator(".demo-anatomy-list").getByRole("button", { name: /日期网格/ });
  const dateInput = preview.getByRole("textbox", { name: "选择日期" });

  await expect.poll(async () => {
    const targetBox = await rect(preview.locator('[data-demo-part="3"]'));
    const highlightBox = await rect(preview.locator('.demo-annotation-highlight[data-annotation-part="3"]'));
    return Math.max(
      Math.abs(targetBox.top - highlightBox.top),
      Math.abs(targetBox.right - highlightBox.right),
      Math.abs(targetBox.bottom - highlightBox.bottom),
      Math.abs(targetBox.left - highlightBox.left),
    );
  }).toBeLessThanOrEqual(2);

  await dateInput.hover();
  await dateInput.focus();
  await expect(preview.locator('.demo-annotation-marker[data-active="true"]')).toHaveCount(0);
  await expect(preview.locator('.demo-annotation-highlight[data-active="true"]')).toHaveCount(0);

  await gridGuide.hover();
  await expect(gridMarker).toHaveAttribute("data-active", "true");
  await expect(preview.locator('.demo-annotation-highlight[data-active="true"]')).toHaveCount(1);
  await page.mouse.move(2, 2);
  await expect(preview.locator('.demo-annotation-highlight[data-active="true"]')).toHaveCount(0);

  await gridMarker.scrollIntoViewIfNeeded();
  const markerBeforeHover = await rect(gridMarker);
  await page.mouse.move(
    (markerBeforeHover.left + markerBeforeHover.right) / 2,
    (markerBeforeHover.top + markerBeforeHover.bottom) / 2,
  );
  await page.waitForTimeout(250);
  const markerAfterHover = await rect(gridMarker);
  expectEdgesToMatch(markerAfterHover, markerBeforeHover, ["top", "right", "bottom", "left"]);
  await expect(gridMarker).toHaveAttribute("data-active", "true");
  await expect(gridGuide).toHaveAttribute("data-active", "true");
  await expect(preview.locator('.demo-annotation-highlight[data-active="true"]')).toHaveCount(1);

  await gridMarker.click();
  await page.mouse.move(2, 2);
  await expect(gridMarker).not.toHaveAttribute("aria-pressed", "true");
  await expect(preview.locator('.demo-annotation-marker[data-active="true"]')).toHaveCount(0);
  await expect(preview.locator('.demo-annotation-highlight[data-active="true"]')).toHaveCount(0);
  await expect(page.locator('.demo-anatomy-list button[data-active="true"]')).toHaveCount(0);

  await gridMarker.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(gridMarker).toBeFocused();
  await expect(gridMarker).toHaveAttribute("data-active", "true");
  const triggerGuide = page.locator(".demo-anatomy-list button").nth(1);
  await triggerGuide.hover();
  await expect(preview.locator('.demo-annotation-marker[data-annotation-part="2"]')).toHaveAttribute("data-active", "true");
  await page.mouse.move(2, 2);
  await expect(gridMarker).toHaveAttribute("data-active", "true");
  await dateInput.click();
  await expect(preview.locator('.demo-annotation-marker[data-active="true"]')).toHaveCount(0);

  const customizeTab = page.locator(".detail-demo-tabs").getByRole("tab", { name: /自由定制/ });
  await customizeTab.click();
  const cellSize = page.getByRole("slider", { name: "日期格尺寸" });
  await cellSize.fill("56");
  await expect(cellSize).toHaveValue("56");
  await expect.poll(async () => (
    preview.locator(".date-picker-day").first().evaluate((element) => element.getBoundingClientRect().width)
  )).toBeGreaterThanOrEqual(55);

  await page.getByRole("combobox", { name: "每周起始日" }).selectOption("0");
  await page.getByRole("switch", { name: "显示周数" }).check();
  await expect(preview.locator(".date-picker-grid thead th").first()).toHaveText("周");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const previewBox = await rect(preview);
  for (const marker of await markers.all()) expectContained(await rect(marker), previewBox);

  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoReady(page, "/components/slider");
  await page.locator(".detail-demo-tabs").getByRole("tab", { name: /自由定制/ }).click();
  const panelValue = page.getByRole("slider", { name: "当前值" });
  const demoValue = page.locator('.demo-stage--detail input[type="range"]');
  await panelValue.fill("37");
  await expect(demoValue).toHaveValue("37");
  await demoValue.fill("73");
  await expect(panelValue).toHaveValue("73");

  await gotoReady(page, "/components/color-picker");
  await page.locator(".detail-demo-tabs").getByRole("tab", { name: /自由定制/ }).click();
  const colorValue = page.getByRole("textbox", { name: "当前颜色十六进制值" });
  await colorValue.fill("#123456");
  await page.getByRole("button", { name: "使用颜色 #af52de" }).click();
  await expect(colorValue).toHaveValue("#af52de");

  await gotoReady(page, "/components/marquee");
  await page.locator(".detail-demo-tabs").getByRole("tab", { name: /自由定制/ }).click();
  const marqueeDuration = page.getByRole("slider", { name: "循环周期" });
  await marqueeDuration.fill("18000");
  await expect(page.locator(".demo-marquee > div")).toHaveCSS("animation-duration", "18s");

  await gotoReady(page, "/components/button");
  await expect(page.getByRole("button", { name: "部件 1：容器" })).toBeVisible();
  await expect(page.getByRole("button", { name: "部件 2：文字标签" })).toBeVisible();
  await expect(page.getByRole("button", { name: "部件 3：可选图标" })).toHaveCount(0);
  await expect(page.locator(".demo-anatomy-list").getByRole("button", { name: /3 可选图标/ })).toBeDisabled();
});

test("touch taps do not lock annotation highlights", async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL as string,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  const touchPage = await context.newPage();
  try {
    await gotoReady(touchPage, "/components/date-picker");
    const preview = touchPage.locator(".detail-demo-preview");
    await preview.getByRole("button", { name: "部件 3：日期网格" }).tap();
    await expect(preview.locator('.demo-annotation-marker[data-active="true"]')).toHaveCount(0);
    await expect(preview.locator('.demo-annotation-highlight[data-active="true"]')).toHaveCount(0);
    await expect(touchPage.locator('.demo-anatomy-list button[data-active="true"]')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("stepper and focus-ring annotations target their visible parts", async ({ page }) => {
  await gotoReady(page, "/components/progress-stepper");
  let preview = page.locator(".detail-demo-preview");
  await expect(preview).toHaveAttribute("data-annotation-layout-ready", "true");
  const indicatorBounds = await unionRect(preview.locator(".demo-stepper li button > span"));
  const labelBounds = await unionRect(preview.locator(".demo-stepper li button > strong"));
  const connectorBounds = await unionRect(preview.locator(".demo-stepper-connector"));
  await expect.poll(() => annotationEdgeDelta(preview, 1, preview.locator(".demo-stepper li button > span"), true)).toBeLessThanOrEqual(2);
  await expect.poll(() => annotationEdgeDelta(preview, 2, preview.locator(".demo-stepper li button > strong"), true)).toBeLessThanOrEqual(2);
  await expect.poll(() => annotationEdgeDelta(preview, 3, preview.locator(".demo-stepper-connector"), true)).toBeLessThanOrEqual(2);
  expect(connectorBounds.bottom - connectorBounds.top).toBeLessThanOrEqual(3);
  expect(labelBounds.top).toBeGreaterThanOrEqual(indicatorBounds.bottom);

  await gotoReady(page, "/components/focus-ring");
  preview = page.locator(".detail-demo-preview");
  await expect(preview).toHaveAttribute("data-annotation-layout-ready", "true");
  const surface = preview.locator(".demo-focus-surface");
  await expect.poll(() => annotationEdgeDelta(preview, 1, preview.locator(".demo-focus-surface button"), true)).toBeLessThanOrEqual(2);
  await expect.poll(() => annotationEdgeDelta(preview, 2, preview.locator(".demo-focus-outline"))).toBeLessThanOrEqual(2);
  await expect.poll(() => annotationEdgeDelta(preview, 3, surface)).toBeLessThanOrEqual(2);
  await expect(surface).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  const outlineBounds = await rect(preview.locator(".demo-focus-outline"));
  const activeButtonBounds = await rect(preview.locator('.demo-focus-target.is-focus-preview button'));
  expect(outlineBounds.top).toBeLessThan(activeButtonBounds.top);
  expect(outlineBounds.right).toBeGreaterThan(activeButtonBounds.right);
  expect(outlineBounds.bottom).toBeGreaterThan(activeButtonBounds.bottom);
  expect(outlineBounds.left).toBeLessThan(activeButtonBounds.left);
});

test("all detail annotation markers stay in dedicated rails", async ({ page }) => {
  test.setTimeout(600_000);
  const componentPaths = catalog.map((item) => `/components/${item.slug}`).sort();
  expect(componentPaths.length).toBeGreaterThanOrEqual(80);

  const violations: string[] = [];
  for (const viewport of [
    { label: "desktop", width: 1280, height: 900 },
    { label: "tablet", width: 768, height: 900 },
    { label: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const path of componentPaths) {
      await gotoReady(page, path);
      const preview = page.locator(".detail-demo-preview");
      if (path === "/components/dialog") {
        await preview.getByRole("button", { name: "编辑资料" }).click();
        await expect(preview.getByRole("dialog", { name: "编辑资料" })).toBeVisible();
      }
      await expect(preview).toHaveAttribute("data-annotation-layout-ready", "true");
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      });
      const layout = await preview.evaluate((previewElement) => {
        const stage = previewElement.querySelector<HTMLElement>(".demo-stage--detail");
        const markers = Array.from(previewElement.querySelectorAll<HTMLElement>(".demo-annotation-marker"));
        if (!stage) return { markerCount: 0, problems: ["missing stage"] };
        const previewRect = previewElement.getBoundingClientRect();
        const stageRect = stage.getBoundingClientRect();
        const markerRects = markers.map((marker) => {
          const rect = marker.getBoundingClientRect();
          return {
            hitRect: {
              bottom: rect.bottom + 9,
              left: rect.left - 9,
              right: rect.right + 9,
              top: rect.top - 9,
            } as DOMRect,
            label: marker.getAttribute("aria-label") ?? "unlabelled marker",
            rect,
          };
        });
        const overlaps = (a: DOMRect, b: DOMRect) => (
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
          && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
        );
        const problems: string[] = [];
        markerRects.forEach(({ hitRect, label, rect }) => {
          if (overlaps(rect, stageRect)) problems.push(`${label} overlaps component stage`);
          if (overlaps(hitRect, stageRect)) problems.push(`${label} hit area overlaps component stage`);
          if (
            rect.left < previewRect.left - 1
            || rect.right > previewRect.right + 1
            || rect.top < previewRect.top - 1
            || rect.bottom > previewRect.bottom + 1
          ) problems.push(`${label} leaves preview bounds`);
        });
        markerRects.forEach((marker, index) => {
          markerRects.slice(index + 1).forEach((other) => {
            if (overlaps(marker.hitRect, other.hitRect)) {
              problems.push(`${marker.label} hit area overlaps ${other.label}`);
            }
          });
        });
        return { markerCount: markers.length, problems };
      });
      if (layout.problems.length) {
        violations.push(`${viewport.label} ${path}: ${layout.problems.join("; ")}`);
      }
      if (layout.markerCount === 0) violations.push(`${viewport.label} ${path}: has no annotations`);
      expect(layout.markerCount, `${viewport.label} ${path}`).toBeLessThanOrEqual(3);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
  expect(violations).toEqual([]);
});

test("home defers card demos and loads the identification dialog on demand", async ({ page }) => {
  await mockIdentificationApi(page);
  await gotoReady(page, "/");

  const identifyTrigger = page.getByRole("button", { name: "AI 识别", exact: true });
  await expect(page.getByRole("dialog", { name: "AI 视觉识别" })).toHaveCount(0);
  await expect(identifyTrigger).not.toHaveAttribute("aria-controls");
  const placeholders = page.locator("[data-demo-placeholder]");
  await expect.poll(() => placeholders.count()).toBeGreaterThan(0);
  const placeholder = placeholders.last();
  const slug = await placeholder.getAttribute("data-demo-placeholder");
  expect(slug).toBeTruthy();
  await expect(placeholder.getByRole("link")).toHaveAttribute("href", `/components/${slug}`);

  await placeholder.scrollIntoViewIfNeeded();
  await expect(
    page.locator(`[data-deferred-demo="${slug}"] [data-demo-slug="${slug}"]`),
  ).toBeVisible();

  await identifyTrigger.click();
  const identificationDialog = page.getByRole("dialog", { name: "AI 视觉识别" });
  await expect(identificationDialog).toBeVisible();
  await expect(identifyTrigger).toHaveAttribute("aria-controls", "identification-dialog");
});

test("results cannot hide provider settings and repeated demos keep unique ids", async ({ page }) => {
  await mockIdentificationApi(page);
  await gotoReady(page, "/");
  await page.getByRole("button", { name: "AI 识别" }).click();
  const dialog = page.getByRole("dialog", { name: "AI 视觉识别" });
  await dialog.getByRole("tab", { name: "网页识别" }).click();
  await dialog.getByRole("textbox", { name: "公开网页地址" }).fill("https://example.com/");
  await dialog.getByRole("button", { name: "分析这个网页" }).click();
  await expect(dialog.getByRole("heading", { name: "识别结果" })).toBeVisible();

  await dialog.getByRole("button", { name: "API 设置" }).click();
  await expect(dialog.getByRole("heading", { name: "配置 AI 服务" })).toBeVisible();

  const duplicateIds = await page.locator("[id]").evaluateAll((elements) => {
    const counts = new Map<string, number>();
    for (const element of elements) counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
    return [...counts.entries()].filter(([, count]) => count > 1);
  });
  expect(duplicateIds).toEqual([]);
});

test("switching source mode prevents a delayed analysis from landing", async ({ page }) => {
  let releaseResponse = () => {};
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route("**/api/identify", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(identificationCapabilities),
      });
      return;
    }
    await responseGate;
    try {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(identificationResult),
      });
    } catch {
      // The request is expected to be gone after the mode change aborts it.
    }
  });

  await gotoReady(page, "/");
  await page.getByRole("button", { name: "AI 识别" }).click();
  const dialog = page.getByRole("dialog", { name: "AI 视觉识别" });
  await dialog.getByRole("tab", { name: "网页识别" }).click();
  await dialog.getByRole("textbox", { name: "公开网页地址" }).fill("https://example.com/");
  await dialog.getByRole("button", { name: "分析这个网页" }).click();
  await expect(dialog.getByRole("status").filter({ hasText: "正在比对" })).toBeVisible();

  expectedIdentificationAbort.add(page);
  await dialog.getByRole("tab", { name: "截图识别" }).click();
  releaseResponse();
  await expect(dialog.getByRole("heading", { name: "识别结果" })).toHaveCount(0);
  await page.waitForTimeout(100);
  await expect(dialog.getByRole("heading", { name: "识别结果" })).toHaveCount(0);
});

test("oversized and malformed image headers are rejected before preview", async ({ page }) => {
  await mockIdentificationApi(page);
  await gotoReady(page, "/");
  await page.getByRole("button", { name: "AI 识别" }).click();
  const dialog = page.getByRole("dialog", { name: "AI 视觉识别" });
  await expect(dialog.getByRole("button", { name: "识别这个界面" })).toBeEnabled();

  const png = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
  png.writeUInt32BE(13, 8);
  png.write("IHDR", 12, "ascii");
  png.writeUInt32BE(8_193, 16);
  png.writeUInt32BE(1, 20);

  const jpeg = Buffer.alloc(21);
  jpeg.set([0xff, 0xd8, 0xff, 0xc0]);
  jpeg.writeUInt16BE(17, 4);
  jpeg[6] = 8;
  jpeg.writeUInt16BE(1, 7);
  jpeg.writeUInt16BE(8_193, 9);

  const webp = Buffer.alloc(30);
  webp.write("RIFF", 0, "ascii");
  webp.write("WEBP", 8, "ascii");
  webp.write("VP8X", 12, "ascii");
  webp[25] = 0x20;

  const gif = Buffer.alloc(10);
  gif.write("GIF89a", 0, "ascii");
  gif.writeUInt16LE(8_193, 6);
  gif.writeUInt16LE(1, 8);

  const files = [
    { buffer: png, mimeType: "image/png", name: "oversized.png" },
    { buffer: jpeg, mimeType: "image/jpeg", name: "oversized.jpg" },
    { buffer: webp, mimeType: "image/webp", name: "oversized.webp" },
    { buffer: gif, mimeType: "image/gif", name: "oversized.gif" },
  ];
  for (const [index, file] of files.entries()) {
    if (index > 0) {
      await dialog.getByRole("tab", { name: "网页识别" }).click();
      await dialog.getByRole("tab", { name: "截图识别" }).click();
    }
    await dialog.locator('input[type="file"]').setInputFiles(file);
    await expect(dialog.getByRole("alert")).toContainText("单边不能超过 8,192 像素");
    await expect(dialog.locator(".analyzer-image-stage img")).toHaveCount(0);
  }

  const oversizedFrameGif = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
    "base64",
  );
  const imageDescriptor = oversizedFrameGif.indexOf(0x2c);
  oversizedFrameGif.writeUInt16LE(1, 6);
  oversizedFrameGif.writeUInt16LE(1, 8);
  oversizedFrameGif.writeUInt16LE(8_193, imageDescriptor + 5);
  oversizedFrameGif.writeUInt16LE(1, imageDescriptor + 7);
  await dialog.getByRole("tab", { name: "网页识别" }).click();
  await dialog.getByRole("tab", { name: "截图识别" }).click();
  await dialog.locator('input[type="file"]').setInputFiles({
    buffer: oversizedFrameGif,
    mimeType: "image/gif",
    name: "oversized-frame.gif",
  });
  await expect(dialog.getByRole("alert")).toContainText("单边不能超过 8,192 像素");
  await expect(dialog.locator(".analyzer-image-stage img")).toHaveCount(0);

  await dialog.getByRole("tab", { name: "网页识别" }).click();
  await dialog.getByRole("tab", { name: "截图识别" }).click();
  await dialog.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from([137, 80, 78, 71]),
    mimeType: "image/png",
    name: "broken.png",
  });
  await expect(dialog.getByRole("alert")).toContainText("无法读取截图尺寸");
  await expect(dialog.locator(".analyzer-image-stage img")).toHaveCount(0);
});

test("home filters survive URL synchronization and reload", async ({ page }) => {
  await gotoReady(page, "/#catalog");
  const shareImage = await page.request.get("/og.png");
  expect(shareImage.ok()).toBeTruthy();
  expect(shareImage.headers()["content-type"]).toBe("image/png");
  const search = page.getByRole("searchbox", { name: "描述你看到的东西" });

  await search.fill("弹窗");
  await page.getByRole("button", { name: "浮层与展开" }).click();
  await page.getByLabel("平台").selectOption("desktop");

  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("弹窗");
  await expect.poll(() => new URL(page.url()).searchParams.get("category")).toBe("overlays");
  await expect.poll(() => new URL(page.url()).searchParams.get("platform")).toBe("desktop");
  await expect.poll(() => new URL(page.url()).hash).toBe("#catalog");

  await page.reload();
  await page.locator('[data-hydrated="true"]').first().waitFor();
  await expect(search).toHaveValue("弹窗");
  await expect(page.getByRole("button", { name: "浮层与展开" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("平台")).toHaveValue("desktop");
  await expect.poll(() => new URL(page.url()).hash).toBe("#catalog");
});
