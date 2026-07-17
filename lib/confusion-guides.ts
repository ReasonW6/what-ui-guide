export interface ConfusionGuide {
  readonly slugs: readonly string[];
  readonly text: string;
}

export const confusionGuides: readonly ConfusionGuide[] = [
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
