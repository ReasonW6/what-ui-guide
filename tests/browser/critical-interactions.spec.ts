import { expect, test, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

async function gotoReady(page: Page, path: string) {
  await page.goto(path);
  await page.locator('[data-hydrated="true"]').first().waitFor();
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
