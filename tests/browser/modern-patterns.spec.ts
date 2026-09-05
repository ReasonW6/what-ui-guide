import { expect, test } from "@playwright/test";

test("light is the default on a dark OS and theme persists across navigation", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const theme = page.getByLabel("配色主题");
  await theme.selectOption("dark");
  await page.goto("/components/date-range-picker");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("配色主题").selectOption("light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("配色主题").selectOption("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("new date and time inputs report invalid ranges and restore valid shortcuts", async ({ page }) => {
  await page.goto("/components/date-range-picker");
  const demo = page.locator(".demo-stage--detail");
  await demo.getByLabel("结束日期").fill("2026-09-01");
  await expect(demo.getByRole("status")).toHaveText("结束日期不能早于开始日期");
  await demo.getByRole("button", { name: "7 天", exact: true }).click();
  await expect(demo.getByLabel("结束日期")).toHaveValue("2026-09-11");
  await page.goto("/components/time-field");
  await demo.getByLabel("预约时间").fill("08:00");
  await expect(demo.getByLabel("预约时间")).toHaveAttribute("aria-invalid", "true");
  await demo.getByRole("button", { name: "09:15", exact: true }).click();
  await expect(demo.getByRole("status")).toContainText("09:15");
});

test("multi-select preserves hidden selections and restores focus after removing", async ({ page }) => {
  await page.goto("/components/multi-select");
  const demo = page.locator(".demo-stage--detail");
  await demo.getByLabel("研发", { exact: true }).check();
  await demo.getByRole("searchbox").fill("产品");
  await expect(demo.getByRole("status")).toHaveText("已选 2 个团队");
  await demo.getByRole("button", { name: "移除设计" }).click();
  await expect(demo.getByRole("searchbox")).toBeFocused();
  await expect(demo.getByRole("status")).toHaveText("已选 1 个团队");
});

test("rating uses native radio navigation and questionnaire keeps previous answers", async ({ page }) => {
  await page.goto("/components/rating");
  const demo = page.locator(".demo-stage--detail");
  await demo.getByRole("radio", { name: "3 星" }).check();
  await page.keyboard.press("ArrowRight");
  await expect(demo.getByRole("status")).toContainText("4 / 5");
  await page.goto("/components/questionnaire");
  await demo.getByLabel("网站", { exact: true }).check();
  await demo.getByRole("button", { name: "下一步" }).click();
  await demo.getByLabel("交互行为", { exact: true }).check();
  await demo.getByRole("button", { name: "上一步" }).click();
  await expect(demo.getByLabel("网站", { exact: true })).toBeChecked();
  await demo.getByRole("button", { name: "下一步" }).click();
  await demo.getByRole("button", { name: "完成问卷" }).click();
  await expect(demo.getByRole("status")).toContainText("网站 · 交互行为");
});

test("menubar handles ArrowUp and Escape and attachment removal preserves focus", async ({ page }) => {
  await page.goto("/components/menubar");
  const demo = page.locator(".demo-stage--detail");
  await demo.getByRole("menuitem", { name: "文件", exact: true }).focus();
  await page.keyboard.press("ArrowUp");
  await expect(demo.getByRole("menuitem", { name: "保存副本" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(demo.getByRole("menuitem", { name: "文件", exact: true })).toBeFocused();
  await page.goto("/components/attachment");
  await demo.getByRole("button", { name: "移除组件笔记.txt" }).click();
  await expect(demo.getByRole("button", { name: "恢复附件" })).toBeFocused();
  await demo.getByRole("button", { name: "恢复附件" }).click();
  await expect(demo.getByRole("button", { name: "预览组件笔记" })).toBeFocused();
});

test("message scroller preserves reading position and chat sends literal local text", async ({ page }) => {
  await page.goto("/components/message-scroller");
  const demo = page.locator(".demo-stage--detail");
  const log = demo.getByRole("log");
  await log.focus();
  await page.keyboard.press("Control+Home");
  await expect.poll(() => log.evaluate(node => node.scrollTop)).toBe(0);
  await demo.getByRole("button", { name: "添加消息" }).click();
  await expect(log).toHaveJSProperty("scrollTop", 0);
  await demo.getByRole("button", { name: /查看新消息/ }).click();
  await expect(demo.getByRole("status")).toHaveText("正在跟随最新消息");
  await page.goto("/components/chat-message");
  await demo.getByLabel("输入消息").fill("<b>本地测试</b>");
  await demo.getByRole("button", { name: "发送", exact: true }).click();
  await expect(demo.locator(".modern-message p")).toHaveText("<b>本地测试</b>");
  await expect(demo.locator(".modern-message b")).toHaveCount(0);
});

test("mobile search and reduced-motion rendering keep new components reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?q=附件卡片");
  await expect(page.locator(".component-card")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "附件卡片", exact: true })).toBeVisible();
  await expect(page.locator(".component-card")).toHaveCSS("opacity", "1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
