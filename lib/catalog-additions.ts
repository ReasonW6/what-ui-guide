import type { CatalogItem, CategoryId } from "./catalog";
import { additionalCode } from "./additional-code";

export const additionalSources: Record<string, { title: string; url: string }> = {
  "date-range-picker": { title: "React Aria · DateRangePicker", url: "https://react-aria.adobe.com/DateRangePicker" },
  "time-field": { title: "React Aria · TimeField", url: "https://react-aria.adobe.com/TimeField" },
  "multi-select": { title: "React Aria · Select", url: "https://react-aria.adobe.com/Select" },
  rating: { title: "Fluent 2 · Rating", url: "https://fluent2.microsoft.design/components/web/react/core/rating/usage" },
  menubar: { title: "WAI-ARIA · Menu and Menubar", url: "https://www.w3.org/WAI/ARIA/apg/patterns/menubar/" },
  questionnaire: { title: "shadcn/ui · Questionnaire", url: "https://ui.shadcn.com/docs/components/base/questionnaire" },
  "chat-message": { title: "shadcn/ui · Message", url: "https://ui.shadcn.com/docs/components/base/message" },
  "message-scroller": { title: "shadcn/ui · Message Scroller", url: "https://ui.shadcn.com/docs/components/base/message-scroller" },
  attachment: { title: "shadcn/ui · Attachment", url: "https://ui.shadcn.com/docs/components/base/attachment" },
};

function item(slug: string, category: CategoryId, zh: string, en: string, summary: string, summaryEn: string, aliases: string[], keywords: string[], anatomy: string[], useWhen: string, avoidWhen: string, accessibility: string[], related: string[]): Omit<CatalogItem, "order"> {
  return { slug, category, platforms: ["web", "mobile", "desktop"], name: { zh, en }, summary: { zh: summary, en: summaryEn }, aliases, keywords, anatomy, useWhen: [useWhen], avoidWhen: [avoidWhen], accessibility, related, aiPrompt: `实现${zh}（${en}）：${summary}`, code: additionalCode[slug] };
}

export const catalogAdditions = [
  item("date-range-picker", "selection", "日期范围选择器", "Date Range Picker", "把开始和结束日期作为一个连续区间选择。", "Select start and end dates as one continuous interval.", ["DateRangePicker", "日期区间", "起止日期"], ["最近七天", "报表日期", "入住离店", "选一段时间"], ["开始日期", "结束日期", "快捷区间"], "筛选报表、预订住宿或确定一个有明确边界的日期区间。", "只需要某一个日期时使用 Date Picker。", ["起止日期各有持久标签，使用原生 date 输入保留键盘与地区格式。", "结束早于开始时显示文字错误并关联 aria-describedby；快捷区间明确是否包含首尾。"], ["date-picker", "calendar-view", "range-slider"]),
  item("time-field", "inputs", "时间输入框", "Time Field", "独立输入小时和分钟，并校验可选时间。", "Enter a time independently of a calendar date.", ["Time Input", "Time Picker", "时间选择"], ["几点几分", "预约时间", "24小时", "15分钟"], ["时间输入", "快捷时段", "时区与校验"], "预约、营业时间、闹钟等需要表达一天内的时间。", "需要确切时刻时，应同时收集日期和时区。", ["输入提供名称、最小最大值与步长，错误用文字表达。", "说明时区，原生 time 的显示格式随浏览器地区设置变化。"], ["date-picker", "spinbutton", "masked-input"]),
  item("multi-select", "selection", "多选选择器", "Multi-select", "从固定候选中选择多个值，并可逐项移除。", "Choose multiple values from a fixed set of options.", ["Multiple Select", "多选下拉", "多选筛选器"], ["选多个", "团队筛选", "勾选标签", "固定选项"], ["候选搜索", "选项集合", "已选项目"], "筛选多个团队、标签或参与者，并需要保留选中状态。", "允许自由创建文本值时使用 Tags Input。", ["示例使用有名称的原生 checkbox 组，Tab 和 Space 可操作。", "搜索时保留隐藏选项的选中状态；移除按钮读出目标名称。"], ["select", "combobox", "tags-input"]),
  item("rating", "selection", "评分控件", "Rating", "用一组有序等级表达主观评价。", "Express a subjective assessment on an ordered scale.", ["Star Rating", "星级评分", "打分"], ["五颗星", "评价", "满意度"], ["评分题目", "星级选项", "评分结果"], "表达满意度、质量评价或体验反馈。", "精确测量数值时使用数字输入，不应把评分当作连续滑块。", ["使用原生单选组，方向键切换、每颗星具备明确读音。", "用 4 / 5 等文字表达结果，悬停预览不改变提交值。"], ["radio-group", "slider", "icon-button"]),
  item("menubar", "actions", "菜单栏", "Menubar", "把应用命令按类别放入持续可见的菜单入口。", "Organize application commands into persistent top-level menus.", ["Menu Bar", "应用菜单栏", "文件编辑视图"], ["文件菜单", "编辑菜单", "桌面编辑器"], ["顶层菜单", "展开菜单", "命令反馈"], "文档编辑器、设计工具等有多组命令的应用。", "网站页面导航应使用普通导航链接。", ["左右方向键切换顶层菜单，上下键移动菜单项，Home/End 跳到首尾。", "Escape 关闭并恢复焦点，Tab 退出菜单栏，顶层只保留一个 Tab 停靠点。"], ["toolbar", "dropdown-menu", "navigation-bar"]),
  item("questionnaire", "inputs", "分步问卷", "Questionnaire", "按步骤收集回答，并在前后切换时保留选择。", "Collect answers step by step while preserving previous responses.", ["Step Form", "引导式问卷", "多步表单"], ["一题一页", "问答向导", "偏好调查"], ["当前问题", "回答选项", "步骤操作"], "逐步收集偏好、需求或引导信息，降低同屏负担。", "需要同时比较所有问题时使用完整表单。", ["每题用 fieldset/legend 关联选项，切步时将焦点移到新问题。", "保留已填答案并提供上一步，完成后展示结果；首次加载不抢焦点。"], ["progress-stepper", "radio-group", "checkbox"]),
  item("chat-message", "content", "聊天消息", "Chat Message", "展示发送者与消息正文，并提供消息级操作。", "Present a sender and message content with message-level actions.", ["Message", "Message Bubble", "Bubble", "聊天气泡"], ["对话", "AI消息", "发送文字", "复制消息"], ["消息正文", "输入与发送", "消息操作"], "即时沟通、对话式助手或支持中心的消息界面。", "无需表达发送者或对话关系时使用普通内容块。", ["发送者、状态都用文字表达，操作按钮有名称。", "状态使用 role=status；仅示例本地交互，不伪装服务端或 AI 回复。"], ["avatar", "list-item", "textarea"]),
  item("message-scroller", "motion", "消息滚动容器", "Message Scroller", "跟随最新消息，同时保留向上阅读的位置。", "Follow new messages while preserving the user's reading position.", ["Chat Scroller", "Stick to Bottom", "聊天滚动区"], ["滚到底部", "新消息提醒", "自动跟随", "消息记录"], ["消息记录", "添加消息", "跟随状态"], "聊天、日志或流式对话中，需要在阅读历史与跟随更新之间切换。", "普通长列表不需要强制跟随底部；加载历史是独立的分页行为。", ["滚动区可聚焦且有名称，role=log 只播报新增消息。", "离开底部后不强行滚动，提供明确的查看新消息操作。"], ["infinite-scroll", "scroll-snap", "anchor-navigation"]),
  item("attachment", "content", "附件卡片", "Attachment", "展示一个文件的身份，并提供预览与移除操作。", "Represent a file with identifying details and attachment actions.", ["File Attachment", "文件附件", "附件预览"], ["消息附件", "文件卡片", "文件名", "删除附件"], ["文件信息", "预览操作", "移除操作"], "消息、评论或表单中表达已附加的文件。", "选择本机文件应使用 File Upload，附件卡片本身不代表已上传成功。", ["提供可读文件名、类型和状态，移除按钮带上目标文件名。", "展开用 aria-expanded 与 aria-controls，按钮不嵌套在另一个按钮内。"], ["file-upload", "card", "progress-bar"]),
];
