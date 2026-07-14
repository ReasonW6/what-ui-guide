<div align="center">

# 这叫啥 UI？

**What UI Is This? — 一份可以亲手试玩的中英双语 UI / UX 视觉词典。**

当你知道一个界面“长什么样、怎么操作”，却不知道它叫什么时，直接描述它。

[在线体验](https://what-ui-guide.reasonw6.chatgpt.site) · [浏览全部组件](https://what-ui-guide.reasonw6.chatgpt.site/#catalog) · [查看手风琴示例](https://what-ui-guide.reasonw6.chatgpt.site/components/accordion)

![81 components](https://img.shields.io/badge/components-81-2496ff?style=flat-square)
![React 19](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=111827)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Accessibility baseline](https://img.shields.io/badge/accessibility-WCAG%202.2%20AA%20baseline-37c98b?style=flat-square)

</div>

![这叫啥 UI？首页](docs/images/home.png)

## 它解决什么问题？

UI / UX 术语往往比界面本身更难找。你可能知道“右键后出现一组操作”“可以拖动的圆点”“从侧边滑出来的面板”，却不知道该搜索 `Context Menu`、`Slider` 还是 `Navigation Drawer`。

“这叫啥 UI？”把抽象术语变成可操作的视觉索引：

- 用自然语言描述你看到的界面，而不是先猜专业名词。
- 直接在目录卡片中点击、输入、拖动或展开，确认它是不是你想找的组件。
- 同时查看中文名称、英文标准术语、别名、平台叫法和容易混淆的概念。
- 把简短、准确的描述复制给编程助手，再进入实现阶段。

> 这是组件视觉词典与教学演示，不是可安装的生产级 UI 组件库。

## 主要能力

| 能力 | 说明 |
| --- | --- |
| 自然语言搜索 | 匹配中文名、英文名、别名、关键词、组成结构、使用建议、分类与平台；支持“可以拖动的圆点”等描述。 |
| 81 个交互条目 | 9 个分类，覆盖导航、菜单、输入、选择、反馈、浮层、内容、数据和交互模式。 |
| 三层展示语言 | `Component Preview` 用于识别外观，`Interactive Demo` 用于亲手操作，`Live Preview` 用于观察参数变化。 |
| 独立详情页 | 每个组件都有定义、别名、完整演示、重置、结构、使用建议、键盘说明、易混术语与相关组件。 |
| 两套代码示例 | 提供原生 `HTML / CSS / JS` 与 `React / CSS` 最小示例，各文件可单独复制。 |
| AI 描述提示词 | 为每个术语提供简短、聚焦的实现描述，方便粘贴给编程助手。 |
| URL 可恢复筛选 | 搜索、分类和平台状态同步到查询参数，刷新或分享后仍可恢复。 |
| 响应式与键盘友好 | 从 320px 到宽屏自适应，并为菜单、Tabs、Grid、Tree、Slider、弹层和拖放等提供键盘路径。 |

## 详情页不只是“大号预览”

桌面端采用左侧演示、右侧知识说明的双栏布局。演示区随页面滚动保持可见，右侧依次解释术语、结构、使用边界、AI 提示词和代码；窄屏下会自然回到纵向排版。

![手风琴组件详情页](docs/images/component-detail.png)

每个详情页都包含：

1. 中英文名称、别名与一句话定义。
2. 可重置的完整交互演示，状态只保留在当前页面。
3. 组成部分、适合使用与不建议使用的场景。
4. 键盘与无障碍实现建议。
5. 易混术语对比，例如 `Select / Dropdown / Combobox`、`Dialog / Modal`、`Toast / Snackbar`。
6. 简短 AI 描述提示词，以及原生和 React 两套代码。
7. 最多 3 个相关组件，方便沿着概念继续探索。

## 组件目录

| 分类 | English | 数量 | 示例 |
| --- | --- | ---: | --- |
| 导航与定位 | Navigation & Orientation | 10 | Navigation Bar、Breadcrumb、Tabs、Command Palette |
| 操作与菜单 | Actions & Menus | 9 | Button、Split Button、Context Menu、Overflow Menu |
| 文本与文件输入 | Text & File Inputs | 9 | Text Field、Search Field、OTP Input、Drop Zone |
| 选择与取值 | Selection & Values | 10 | Checkbox、Combobox、Slider、Date Picker |
| 反馈与状态 | Feedback & Status | 11 | Alert、Toast、Progress Bar、Status Indicator |
| 浮层与展开 | Overlays & Disclosure | 10 | Dialog、Popover、Side Sheet、Accordion |
| 内容与媒体 | Content & Media | 8 | Card、Carousel、Lightbox、Truncated Text |
| 数据展示 | Data Display | 6 | Data Table、Data Grid、Tree View、Chart |
| 动效与交互模式 | Motion & Interaction | 8 | Drag and Drop、Infinite Scroll、Pan and Zoom、Before–After Slider |
| **合计** |  | **81** |  |

首页按策展顺序每次显示 24 项，并支持分类与 `Web / Mobile / Desktop` 平台组合筛选。按 <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd> 可以随时聚焦搜索框。

## 本地运行

### 环境要求

- Node.js `>= 22.13.0`
- npm

### 启动开发服务器

```bash
git clone https://github.com/ReasonW6/what-ui-guide.git
cd what-ui-guide
npm install
npm run dev
```

按照终端输出打开本地地址即可。

### 验证项目

```bash
npm run lint
npm run build
npm test
```

`npm test` 会运行目录与交互契约测试、生产构建及渲染 HTML 测试。现有测试覆盖 81 条目录数据、Demo Registry、双语搜索、关联路由、代码样例语法、常见交互族与未知 slug 的 404 行为。

## 技术栈

- [React 19](https://react.dev/) + TypeScript
- [vinext](https://github.com/cloudflare/vinext) + Vite
- Next.js App Router 风格的文件路由
- Tailwind CSS 4 与项目自定义 CSS
- Cloudflare Worker 兼容运行时
- ESLint 9 与 Node.js 内置测试运行器
- [OpenAI Sites](https://what-ui-guide.reasonw6.chatgpt.site) 托管

产品内容来自本地静态注册表。演示只维护页面局部状态，不连接数据库，不上传真实文件，也不会执行示例代码字符串。

## 项目结构

```text
app/
├─ page.tsx                    # 首页与目录入口
├─ components/[slug]/page.tsx # 81 个静态详情路由
└─ ui/
   ├─ CatalogBrowser.tsx       # 搜索、筛选与分批加载
   ├─ DemoStage.tsx            # 交互演示与 Demo Registry
   ├─ InteractiveDetail.tsx    # 详情演示重置与提示词复制
   └─ CodeExplorer.tsx         # 原生 / React 示例与文件复制
lib/
├─ catalog.ts                  # CatalogItem 注册表与构建时校验
└─ catalog-search.ts           # 搜索和筛选逻辑
tests/                         # 目录、交互契约与渲染路由测试
worker/index.ts                # vinext Cloudflare Worker 入口
.openai/hosting.json           # Sites 部署声明
```

内容数据与演示函数分离：`CatalogItem` 保存可序列化的双语术语、关键词、结构、建议、提示词与代码文件；`DemoRegistry` 按 slug 映射 React 演示，并通过 `density: "card" | "detail"` 控制首页和详情页密度。

## 添加一个组件

新增条目时需要同时完成三件事：

1. 在 `lib/catalog.ts` 注册完整的 `CatalogItem`，包含双语名称、别名、搜索词、平台、使用建议、关联条目、AI 提示词及两套代码文件。
2. 在 `app/ui/DemoStage.tsx` 添加对应演示，并注册到 `DemoRegistry`。
3. 运行 `npm test`，确认 slug 唯一、关联存在、演示已注册、代码可解析且详情页可生成。

请让卡片预览只保留一个主要交互；详情页演示可以更完整，但不应发起真实网络请求或执行破坏性操作。

## 无障碍基线

项目以 WCAG 2.2 AA 为设计基线，而不是宣称已经通过完整认证。当前实现包括：

- 跳过导航链接与明显的 `:focus-visible` 焦点环。
- 主要触控目标按 44px 最小尺寸设计。
- 优先使用语义 HTML，并补充必要的 ARIA role、state 与实时状态区。
- Modal 类演示支持 <kbd>Esc</kbd>、焦点约束和关闭后的焦点恢复。
- 拖放排序提供上移 / 下移按钮替代方式及屏幕阅读器状态通知。
- 支持 `prefers-reduced-motion`；表格、代码与复杂演示使用局部滚动，避免页面横向溢出。

## 参与改进

欢迎通过 Issue 提交：

- “我见过这个界面，但不知道叫什么”的真实描述。
- 缺失或容易混淆的 UI / UX 术语。
- 演示交互、键盘操作、代码样例或中文解释的问题。
- 不同平台对同一模式的命名差异。

提交 Pull Request 时，请保持改动聚焦，并确保 `npm run lint`、`npm run build` 与 `npm test` 通过。

## 致谢

产品视觉与“用真实名称解释界面”的方向受到 [Name That UI](https://namethatui.com/) 启发。README 的信息组织参考了 [shadcn/ui](https://github.com/shadcn-ui/ui)、[Storybook](https://github.com/storybookjs/storybook)、[Cal.com](https://github.com/calcom/cal.diy) 与 [Dub](https://github.com/dubinc/dub) 等成熟项目常用的做法：先说明价值，再展示产品，最后给出运行、架构与参与方式。

## 许可

当前仓库尚未选择开源许可证。源码可以在公开仓库中查看，但在添加明确许可证前，默认保留所有权利。

---

<div align="center">

不知道它叫什么？[描述给它听，然后亲手试一试。](https://what-ui-guide.reasonw6.chatgpt.site)

</div>
