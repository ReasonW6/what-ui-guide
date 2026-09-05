export interface ConfusionGuide {
  readonly slugs: readonly string[];
  readonly text: string;
}

export const confusionGuides: readonly ConfusionGuide[] = [
  { slugs: ["date-range-picker"], text: "Date Range Picker 选择起止区间；Date Picker 选择单个日期；Calendar View 展示日期与事件，通常不负责提交日期值。" },
  { slugs: ["time-field"], text: "Time Field 输入一天内的时间；Date Picker 选择日期。需要全球一致的时间点时，还必须有日期和时区。" },
  { slugs: ["multi-select"], text: "Multi-select 从固定候选中选择多个值；Tags Input 允许创建文本标签；Combobox 描述输入与候选选择的组合，不必然支持多选。" },
  { slugs: ["rating"], text: "Rating 选择离散评价等级；Slider 选择范围内的数值。只读评分只展示结果，不应表现成可编辑控件。" },
  { slugs: ["menubar"], text: "Menubar 展开应用命令菜单；Toolbar 直接提供常用工具；Navigation Bar 使用链接切换页面或区域。" },
  { slugs: ["questionnaire"], text: "Questionnaire 收集回答并管理问题步骤；Progress Stepper 只表达阶段和进度，本身不负责表单验证。" },
  { slugs: ["chat-message"], text: "Chat Message 表达发送者与对话内容；Bubble 是消息的视觉容器；Message Scroller 管理整段消息记录的阅读位置。" },
  { slugs: ["message-scroller"], text: "Message Scroller 处理跟随最新消息与保留阅读位置；Infinite Scroll 在接近列表边界时加载更多内容，两者可以组合。" },
  { slugs: ["attachment"], text: "Attachment 表示已关联的文件及操作；File Upload 负责选取和上传文件；Card 只是通用内容容器。" },
  {
    slugs: ["select", "dropdown-menu", "combobox", "command-palette"],
    text: "Select 从固定选项中选值；Dropdown Menu 执行少量命令；Combobox 输入筛选选值；Command Palette 搜索并执行全局命令。",
  },
  {
    slugs: ["dialog", "alert-dialog", "scrim"],
    text: "Dialog 是内容容器；Modal 描述是否阻断背景；Scrim 是变暗并拦截背景交互的遮罩层。",
  },
  {
    slugs: ["toast", "snackbar"],
    text: "Toast 通常只告知状态；Snackbar 常在底部出现，并可附带一个简短操作。",
  },
  {
    slugs: ["tooltip", "popover", "hover-card"],
    text: "Tooltip 是短提示；Popover 可交互；Hover Card 用悬停或聚焦预览关联内容。",
  },
  {
    slugs: ["sidebar-navigation", "navigation-drawer", "side-sheet", "split-view"],
    text: "Sidebar 常驻导航；Drawer 临时滑出导航；Side Sheet 临时承载任务；Split View 是可并列调整的两个区域。",
  },
  {
    slugs: ["slider", "range-slider", "progress-bar", "progress-ring", "spinner"],
    text: "Slider 选择单值；Range Slider 选择区间；Progress Bar / Ring 展示确定进度；Spinner 只表示处理中。",
  },
  {
    slugs: ["badge", "chip", "tags-input"],
    text: "Badge 显示状态或数量；Chip 表示可操作实体；Tags Input 用于创建和编辑多个标签。",
  },
  {
    slugs: ["carousel", "image-gallery", "lightbox"],
    text: "Carousel 依次轮播；Gallery 总览一组图片；Lightbox 放大当前媒体并遮罩页面。",
  },
  {
    slugs: ["data-table", "data-grid"],
    text: "Data Table 侧重阅读与排序；Data Grid 还支持单元格选择、编辑等表格式操作。",
  },
] as const;

export function getConfusionGuide(slug: string): ConfusionGuide | undefined {
  return confusionGuides.find((guide) => guide.slugs.includes(slug));
}
