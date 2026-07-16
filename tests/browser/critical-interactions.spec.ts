import { expect, test, type Locator, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

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
    errors.push(`request: ${request.url()} (${request.failure()?.errorText})`);
  });
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? [], "unexpected browser errors").toEqual([]);
});

test("production start serves every linked build asset", async ({ page, request }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

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
  const drawer = drawerDemo.locator("#demo-navigation-drawer");
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
    const drawer = drawerStage.locator("#demo-navigation-drawer");
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
    expectEdgesToMatch(await rect(stage.locator(overlay.selector)), await rect(stage), ["top", "right", "bottom", "left"]);
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
  expect(Math.abs(toastStageBox.bottom - toastBox.bottom - 13)).toBeLessThanOrEqual(2);
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

  await page.keyboard.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", "demo-command-1");
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

test("home filters survive URL synchronization and reload", async ({ page }) => {
  await gotoReady(page, "/#catalog");
  const shareImage = await page.request.get("/og-image.png");
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
