<div align="center">

# What UI? / 这叫啥 UI？

**看图、看网页、亲手试玩，找到准确的 UI / UX 组件名称。**

当你知道一个界面“长什么样、怎么操作”，却不知道它叫什么时，What UI? 会给出候选术语、判断证据、易混区别和可落地的实现指导。

[在线体验](https://what-ui-guide.reasonw6.chatgpt.site) · [浏览组件](https://what-ui-guide.reasonw6.chatgpt.site/#catalog) · [提交问题](https://github.com/ReasonW6/what-ui-guide/issues)

![90 components](https://img.shields.io/badge/components-90-2496ff?style=flat-square)
![React 19](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=111827)
![License: 0BSD](https://img.shields.io/badge/license-0BSD-37c98b?style=flat-square)

</div>

![What UI? 早期深色首页](docs/images/home.png)

默认使用亮色主题，也支持深色和跟随系统。上图保留早期深色版参考。2026-09 新增日期范围、时间输入、多选、评分、菜单栏、分步问卷、聊天消息、消息滚动容器和附件卡片。[审查记录与官方参考](docs/REVIEW-2026-09.md)。

## 它解决什么问题？

UI / UX 术语往往比界面本身更难搜索。你可能见过“右键后出现的一组操作”“可以拖动的圆点”“从侧边滑出的面板”，却不知道应该搜索 `Context Menu`、`Slider` 还是 `Navigation Drawer`。

What UI? 把抽象术语变成可观察、可操作、可实现的视觉索引：

- 上传、粘贴或拖入截图，并框选真正想识别的区域；
- 输入公开网页 URL，在安全边界内分析页面；
- 获得 1–3 个候选名称、可观察证据、置信度与易混区别；
- 亲手操作真实演示，再查看结构、行为、样式、无障碍与代码；
- 用中文、英文、别名、平台或自然语言描述搜索 90 个术语。

> What UI? 是视觉词典和教学工具，不是可直接安装的组件库。AI 结果用于辅助判断，不代替 DOM 检查和人工确认。

## 核心能力

| 能力 | 说明 |
| --- | --- |
| 截图与区域识别 | 支持上传 PNG、JPEG、WebP、GIF；分析前在浏览器中裁剪并标准化为 PNG，减少无关画面并确保服务端可完整校验。 |
| 多服务商 BYOK | 内置主流服务商预设，也支持自定义 OpenAI / Anthropic 兼容 API、地址和模型。 |
| 可解释结果 | 只从本项目目录中选择候选，并说明证据、区别、不确定项和必要追问。 |
| 公开网页分析 | 白名单网页可使用浏览器快照；否则仅在受支持条件下使用受限的公开网页语义分析。 |
| 交互式词典 | 90 个条目均有卡片预览、完整演示、键盘路径、使用边界和相关术语。 |
| 实现工作台 | 提供结构、行为、样式、无障碍建议，以及原生与 React 两套可复制代码。 |
| 自然语言搜索 | 匹配中英文名称、别名、关键词、平台、分类与“可以拖动的圆点”等描述。 |
| 可恢复筛选 | 搜索、分类和平台状态写入 URL，刷新或分享后仍可恢复。 |

## AI 视觉识别

AI 识别位于独立浮层中，不改变首页原有目录布局。关闭浮层后，焦点会回到触发按钮。

识别流程分为四步：

1. **提供画面**：上传截图并框选局部区域，或输入公开 `https://` 网页。
2. **生成候选**：模型只能从项目已有 slug 中选择 1–3 个候选；无法可靠识别时返回 `unknown`。
3. **解释判断**：逐项展示视觉或行为证据、相近组件差异、置信度、不确定项和追问。
4. **落地实现**：候选重新关联本地可信目录，展示真实演示、实现建议和代码，而不是直接采用模型生成的未知代码。

### 支持的 AI 服务

| 预设 | 默认模型 | 接口 | 说明 |
| --- | --- | --- | --- |
| OpenAI | `gpt-5.6-sol` | Responses | 支持图片；可对公开网页做限定域名检索 |
| Anthropic | `claude-sonnet-5` | Messages | 支持图片 |
| Kimi / Kimi Global | `kimi-k2.6` | OpenAI Chat | 中国站与国际站分别配置 |
| 硅基流动中国站 / 国际站 | `Qwen/Qwen3.6-27B` | OpenAI Chat | 账户、Key 与端点必须对应 |
| OpenRouter | `google/gemini-3.5-flash` | OpenAI Chat | 图片能力取决于所选路由模型 |
| Google Gemini | `gemini-3.5-flash` | OpenAI Chat 兼容层 | 支持图片 |
| xAI Grok | `grok-4.5` | OpenAI Chat | 支持图片 |
| 自定义 API | 用户填写 | Chat / Responses / Messages | 能力取决于目标服务和模型 |

模型供应会变化，因此模型名均可修改。填写 Key 后可点击“连接”，通过服务商的模型或凭据接口检查地址、Key 和模型，不发起正式识别。

自定义地址仅接受公开 HTTPS 域名；填写站点根地址时会自动补全 `/v1`，已有有效路径则保留。应用拒绝凭据 URL、查询参数、显式端口、IP、内网主机和重定向，也不会成为任意请求代理。

<details>
<summary>服务商能力参考文档</summary>

[OpenAI](https://developers.openai.com/api/docs/guides/images-vision) · [Anthropic](https://platform.claude.com/docs/en/build-with-claude/vision) · [Kimi](https://platform.kimi.com/docs/guide/use-kimi-vision-model) · [SiliconFlow 中国站](https://docs.siliconflow.cn/cn/userguide/capabilities/multimodal-vision) · [SiliconFlow 国际站](https://docs.siliconflow.com/en/userguide/capabilities/vision) · [OpenRouter](https://openrouter.ai/docs/guides/overview/multimodal/image-understanding) · [Gemini](https://ai.google.dev/gemini-api/docs/openai) · [xAI](https://docs.x.ai/developers/model-capabilities/images/understanding)

</details>

### Key 与隐私

- Key 默认只保留在当前页面内存，刷新后清除。
- 用户主动开启“在此浏览器加密保存”后，应用使用不可导出的 AES-256-GCM `CryptoKey`、随机 IV 和同源 IndexedDB 保存配置。
- 截图、URL、识别结果和历史不会写入本站数据库；应用也不主动把 Key 写入日志。
- 通常 Key 会临时经过本站 Worker 再发送给服务商；硅基流动中国站的连接测试和截图识别由浏览器直连 `api.siliconflow.cn`。
- 浏览器同源策略会阻止其他网站直接读取本站存储，但本地加密不能防御同源 XSS、恶意扩展、DevTools 或受控设备。

建议使用限额、可撤销的专用 Key，并避免上传包含身份信息、密钥或其他敏感数据的截图。

## 组件词典

目录覆盖 9 个类别、90 个 UI / UX 术语：

| 分类 | English | 数量 | 示例 |
| --- | --- | ---: | --- |
| 导航与定位 | Navigation & Orientation | 10 | Navigation Bar、Breadcrumb、Tabs |
| 操作与菜单 | Actions & Menus | 10 | Button、Context Menu、Overflow Menu |
| 文本与文件输入 | Text & File Inputs | 11 | Text Field、OTP Input、Drop Zone |
| 选择与取值 | Selection & Values | 13 | Checkbox、Combobox、Date Picker |
| 反馈与状态 | Feedback & Status | 11 | Alert、Toast、Progress Bar |
| 浮层与展开 | Overlays & Disclosure | 10 | Dialog、Popover、Side Sheet |
| 内容与媒体 | Content & Media | 10 | Card、Carousel、Lightbox |
| 数据展示 | Data Display | 6 | Data Table、Data Grid、Tree View |
| 动效与交互模式 | Motion & Interaction | 9 | Drag and Drop、Pan and Zoom |
| **合计** |  | **90** |  |

![组件详情页](docs/images/component-detail.png)

每个详情页包含：

- 中英文名称、别名、一句话定义和组成结构；
- 可重置的完整交互演示；
- 适用场景与不建议使用的情况；
- 键盘操作和无障碍实现建议；
- 易混术语对比、AI 描述提示词和相关组件；
- 原生 HTML / CSS / JS 与 React / CSS 示例。

首页每次显示 24 项，并支持分类与 `Web / Mobile / Desktop` 平台组合筛选。按 <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd> 可随时聚焦搜索框。

## 本地运行

要求 Node.js `>= 22.13.0`。

```bash
git clone https://github.com/ReasonW6/what-ui-guide.git
cd what-ui-guide
npm install
npm run dev
```

AI 识别可以直接使用界面中的 BYOK 设置。部署方也可以复制 `.env.example` 为 `.env.local`，配置托管能力。

<details>
<summary>可选环境变量</summary>

| 变量 | 用途 |
| --- | --- |
| `OPENAI_API_KEY` | 部署方托管的 OpenAI Key；必须同时配置每日额度与 D1，否则使用 BYOK |
| `OPENAI_MODEL` | 托管识别模型 |
| `MANAGED_AI_DAILY_LIMIT` | 托管 Key 的全站每日硬额度，正整数且不超过 10000 |
| `BROWSER_ALLOWED_HOSTS` | 允许生成网页快照的精确主机名，不支持通配符 |
| `CUSTOM_PROVIDER_ALLOWED_HOSTS` | 允许 Worker 代理的自定义 API 精确主机名；留空时关闭代理 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Browser Rendering 账户 ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Browser Rendering API Token |
| `BROWSER` | Cloudflare Worker Browser Run binding；项目已在 `vite.config.ts` 声明 |

</details>

Browser Run 的 `quickAction()` 在本地模式尚不可用，因此配置使用
`browser: { binding: "BROWSER", remote: true }`。本地开发默认不连接远程 binding；需要测试网页快照时设置 `WHAT_UI_REMOTE_BINDINGS=true`，并先登录
Cloudflare，并只在 `BROWSER_ALLOWED_HOSTS` 中加入确实需要抓取的公开主机名；
未配置允许列表时不会发起浏览器任务。生产部署会沿用同名 `BROWSER` binding。

### 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm start` | 重新构建并启动生产 Worker 预览 |
| `npm run audit:security` | 显示完整依赖审计，并验证限期的图片解析器缓解措施 |
| `npm run generate:examples` | 从新增组件的实际演示同步可复制 React 代码 |
| `npm run lint` | 运行 ESLint |
| `npm test` | 类型检查、契约测试、构建、生产 HTTP 与 Playwright 浏览器测试 |
| `npm run test:browser` | 单独构建并运行 Playwright 浏览器测试 |

首次运行浏览器测试前需要执行 `npx playwright install chromium`。

## 安全边界

- 单张源截图最大 8 MiB；上传后先校验文件签名与尺寸，再由浏览器解码、裁剪并标准化为服务端完整校验的 PNG。
- URL 仅接受公开 `https://` 页面；拒绝 localhost、私网 IP、凭据 URL 和非 Web 协议。
- 浏览器快照只允许 `BROWSER_ALLOWED_HOSTS` 中的精确主机名，避免 SSRF 和开放代理风险。
- 自定义 API 的 Worker 代理默认关闭；部署方只有在 `CUSTOM_PROVIDER_ALLOWED_HOSTS` 中显式信任精确 HTTPS 主机名后才能启用。
- 未配置快照时，网页分析无法看到登录态、悬停态、弹层或滚动后才出现的界面，建议改用截图。
- 自定义上游请求限时 45 秒，响应正文上限 1 MiB。
- 请求优先使用 Cloudflare Rate Limiting binding；缺少 binding 时改用 Sites D1 的原子持久计数，绝不退回单 isolate 内存计数。
- 托管 OpenAI Key 只有在 `MANAGED_AI_DAILY_LIMIT` 与 D1 同时可用时才启用；全站每日额度由 D1 原子扣减。仍建议在供应商侧设置预算与用量告警。
- 产品不提供账户、云端历史或持久化收藏；只有用户主动启用的加密凭据会保留在本机浏览器。

## 技术栈

- React 19、TypeScript、Next.js App Router 风格路由
- GSAP / @gsap/react、视口进入动效、减少动态偏好、亮色 / 深色主题
- vinext、Vite、Tailwind CSS 4、Cloudflare Worker
- OpenAI Responses、OpenAI-compatible Chat、Anthropic Messages
- Web Crypto、IndexedDB、可选 Cloudflare Browser Rendering
- Node.js Test Runner、ESLint、Playwright

## 项目结构

```text
app/
├─ page.tsx                    # 首页与目录
├─ api/identify/route.ts       # 识别接口与能力探测
├─ components/[slug]/page.tsx # 90 个详情路由
└─ ui/                         # 目录、识别浮层、演示与代码浏览器
lib/
├─ catalog.ts                  # 双语术语注册表
├─ ai-provider-config.ts       # 服务商与端点配置
├─ *-identification.ts         # 识别协议适配与结果验证
└─ client/credential-vault.ts  # 本地加密凭据
tests/                         # 目录、交互、识别与生产测试
worker/index.ts                # Cloudflare Worker 入口
```

内容数据与演示函数分离：`CatalogItem` 保存术语、关键词、结构、建议和代码；`DemoRegistry` 按 slug 映射 React 演示。

## 无障碍基线

项目以 WCAG 2.2 AA 为设计基线，但不宣称已经通过完整认证。当前实现包括：

- 跳过导航链接、明显的 `:focus-visible` 焦点和主要触控目标尺寸；
- 语义 HTML、必要的 ARIA role / state 与实时状态区；
- Modal 的 <kbd>Esc</kbd>、焦点约束和关闭后焦点恢复；
- 拖放排序的按钮替代路径和屏幕阅读器状态通知；
- `prefers-reduced-motion` 与复杂内容的局部滚动。

## 参与贡献

欢迎提交 Issue 或 Pull Request，特别是：

- 缺失或容易混淆的 UI / UX 术语；
- 不准确的中文解释、键盘操作或无障碍建议；
- 演示交互与代码示例的问题；
- 不同平台对同一模式的命名差异。

新增组件时，请同时补充 `CatalogItem`、`DemoRegistry`、结构标注、可复制代码和相应测试。新增词条可在 `lib/catalog-additions.ts` 中维护。提交前运行：

```bash
npm run lint
npm test
```

## 致谢

产品方向受到 [Name That UI](https://namethatui.com/) 启发。README 的信息层级参考了 [shadcn/ui](https://github.com/shadcn-ui/ui)、[Storybook](https://github.com/storybookjs/storybook) 和 [Dub](https://github.com/dubinc/dub)；未复制这些项目的代码。

`public/github-mark.svg` 来源于 [Primer Octicons](https://github.com/primer/octicons)，按 MIT License 使用。完整说明见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。

## 许可

本项目采用 [0BSD License](./LICENSE)。
