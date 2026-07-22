export interface DemoSettings {
  weekStartsOn: 0 | 1;
  cellSize: number;
  showWeekNumbers: boolean;
  splitPosition: number;
  sliderValue: number;
  rangeLow: number;
  rangeHigh: number;
  progress: number;
  pickerColor: string;
  zoom: number;
  compare: number;
  marqueeDuration: number;
}

export const DEFAULT_DEMO_SETTINGS: DemoSettings = {
  weekStartsOn: 1,
  cellSize: 44,
  showWeekNumbers: false,
  splitPosition: 38,
  sliderValue: 62,
  rangeLow: 62,
  rangeHigh: 84,
  progress: 42,
  pickerColor: "#0a6cff",
  zoom: 1,
  compare: 48,
  marqueeDuration: 12_000,
};

export interface BaseDemoControl {
  key: keyof DemoSettings;
  label: string;
  description?: string;
}

export type ColorDemoControl = BaseDemoControl & {
  type: "color";
};

export type RangeDemoControl = BaseDemoControl & {
  type: "range";
  min: number;
  max: number;
  step: number;
  unit?: string;
};

export type SelectDemoControl = BaseDemoControl & {
  type: "select";
  options: readonly { label: string; value: string | number }[];
};

export type ToggleDemoControl = BaseDemoControl & {
  type: "toggle";
};

export type DemoControl =
  | ColorDemoControl
  | RangeDemoControl
  | SelectDemoControl
  | ToggleDemoControl;

const componentControls: Readonly<Record<string, readonly DemoControl[]>> = {
  "date-picker": [
    {
      key: "weekStartsOn",
      label: "每周起始日",
      type: "select",
      options: [
        { label: "周一", value: 1 },
        { label: "周日", value: 0 },
      ],
    },
    {
      key: "cellSize",
      label: "日期格尺寸",
      type: "range",
      min: 36,
      max: 56,
      step: 2,
      unit: "px",
    },
    { key: "showWeekNumbers", label: "显示周数", type: "toggle" },
  ],
  "split-view": [
    {
      key: "splitPosition",
      label: "左侧面板宽度",
      type: "range",
      min: 28,
      max: 65,
      step: 1,
      unit: "%",
    },
  ],
  slider: [
    {
      key: "sliderValue",
      label: "当前值",
      type: "range",
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
    },
  ],
  "range-slider": [
    {
      key: "rangeLow",
      label: "下限",
      type: "range",
      min: 0,
      max: 100,
      step: 1,
    },
    {
      key: "rangeHigh",
      label: "上限",
      type: "range",
      min: 0,
      max: 100,
      step: 1,
    },
  ],
  "color-picker": [
    { key: "pickerColor", label: "当前颜色", type: "color" },
  ],
  "progress-bar": [
    {
      key: "progress",
      label: "完成进度",
      type: "range",
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
    },
  ],
  "progress-ring": [
    {
      key: "progress",
      label: "完成进度",
      type: "range",
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
    },
  ],
  "pan-and-zoom": [
    {
      key: "zoom",
      label: "缩放比例",
      type: "range",
      min: 0.7,
      max: 1.6,
      step: 0.05,
      unit: "×",
    },
  ],
  "before-after-slider": [
    {
      key: "compare",
      label: "对比位置",
      type: "range",
      min: 0,
      max: 100,
      step: 1,
      unit: "%",
    },
  ],
  marquee: [
    {
      key: "marqueeDuration",
      label: "循环周期",
      type: "range",
      min: 4_000,
      max: 24_000,
      step: 1_000,
      unit: "ms",
    },
  ],
};

export function getDemoControls(slug: string): readonly DemoControl[] {
  return componentControls[slug] ?? [];
}

export interface AnnotationGuide {
  id: number;
  label: string;
  description: string;
  selector: string | null;
  placement?: "left" | "right" | "top";
  targetMode?: "first" | "all" | "union";
}

type AnnotationDefinition = Omit<AnnotationGuide, "id" | "label">;

const annotationDefinitions: Readonly<
  Record<string, readonly [AnnotationDefinition, AnnotationDefinition, AnnotationDefinition]>
> = {
  "date-picker": [
    {
      selector: '.demo-date-picker input, .demo-field input[type="date"]',
      placement: "left",
      description: "日期输入显示当前值，也保留直接键入日期的路径。",
    },
    {
      selector: '.demo-date-picker button[aria-haspopup="dialog"], .demo-field input[type="date"]',
      placement: "right",
      description: "日历触发器负责展开选择面板，并向辅助技术同步展开状态。",
    },
    {
      selector: '.demo-date-picker [role="grid"], .demo-field:has(input[type="date"])',
      placement: "right",
      description: "日期网格按周组织日期，并应支持方向键移动与清楚的选中状态。",
    },
  ],
  "progress-stepper": [
    {
      selector: ".demo-stepper li button > span",
      targetMode: "union",
      description: "步骤指示器用编号或完成标记呈现每个阶段的状态。",
    },
    {
      selector: ".demo-stepper li button > strong",
      targetMode: "union",
      description: "步骤标签说明各阶段任务，并让可返回的步骤保持可操作。",
    },
    {
      selector: ".demo-stepper-connector",
      targetMode: "union",
      description: "连接线把离散步骤组织成一条有先后方向的流程。",
    },
  ],
  "focus-ring": [
    {
      selector: ".demo-focus-surface button",
      targetMode: "union",
      description: "可聚焦控件组成键盘导航顺序，并可用 Tab 逐一到达。",
    },
    {
      selector: ".demo-focus-outline",
      description: "外侧轮廓贴合当前控件但不改变布局，清楚标示键盘位置。",
    },
    {
      selector: ".demo-focus-surface",
      description: "对比背景让焦点轮廓在明暗界面中都保持足够可见。",
    },
  ],
  tabs: [
    {
      selector: '.demo-tabs [role="tablist"]',
      description: "标签列表把一组同级视图组织在同一个键盘导航范围内。",
    },
    {
      selector: '.demo-tabs [role="tab"]',
      targetMode: "all",
      description: "标签按钮切换当前项目，并通过选中状态说明哪个面板正在显示。",
    },
    {
      selector: '.demo-tabs [role="tabpanel"]',
      description: "内容面板承载当前标签对应的信息，并与活动标签保持关联。",
    },
  ],
  "split-view": [
    {
      selector: ".demo-split-view > nav",
      description: "主面板保留列表或导航上下文，让用户不必离开当前工作区。",
    },
    {
      selector: '.demo-split-view > [role="separator"]',
      description: "分隔条可拖动或用方向键调整，并持续暴露当前面板比例。",
    },
    {
      selector: ".demo-split-view > section",
      description: "详情面板展示当前项目的内容，并随主面板选择即时更新。",
    },
  ],
  dialog: [
    {
      selector: ".demo-backdrop",
      description: "遮罩弱化背景内容，帮助用户把注意力留在当前任务。",
    },
    {
      selector: '.demo-dialog[role="dialog"]',
      description: "对话框容器建立独立任务边界，并在打开期间管理内部焦点。",
    },
    {
      selector: ".demo-dialog > strong, .demo-dialog > .demo-field, .demo-dialog > .demo-dialog-actions",
      targetMode: "union",
      description: "标题、内容和操作共同说明任务、收集输入，并提供明确的完成或取消路径。",
    },
  ],
  "progress-ring": [
    {
      selector: ".demo-progress-ring circle:first-of-type",
      description: "圆环轨道给出完整范围，作为当前进度弧线的视觉基准。",
    },
    {
      selector: ".demo-progress-ring circle:nth-of-type(2)",
      description: "进度弧线按完成比例填充，让变化方向和剩余量一眼可见。",
    },
    {
      selector: ".demo-progress-ring output",
      description: "数值标签提供精确结果，避免只依赖颜色或弧线长度传达进度。",
    },
  ],
  "before-after-slider": [
    {
      selector: ".demo-before",
      description: "前图与后图严格对齐，作为拖动比较时的一侧视觉基准。",
    },
    {
      selector: ".demo-after",
      description: "后图层随揭示位置显露，让同一区域的变化可以连续比较。",
    },
    {
      selector: ".demo-compare-control, .demo-compare-line, .demo-compare-handle",
      targetMode: "union",
      description: "分隔把手同时支持拖动和键盘调整，并清楚标示当前揭示位置。",
    },
  ],
};

function genericDescription(label: string): string {
  return `“${label}”是这个组件的关键组成部分；观察它的位置、状态以及与相邻元素的关系。`;
}

function semanticSelector(label: string): string | null {
  if (/遮罩/.test(label)) {
    return ".demo-backdrop, .demo-drawer-scrim, .demo-command-backdrop, .demo-scrim-layer";
  }
  if (/分隔|连接线|轮廓/.test(label)) {
    return "[role='separator'], hr, .demo-divider-rule, .demo-split-divider, .demo-compare-line";
  }
  if (/轨道|填充条|弧线|旋转图形|滑块|把手/.test(label)) {
    return "input[type='range'], [role='slider'], [role='progressbar'], progress, .demo-progress-ring, .demo-spinner, .demo-compare-handle";
  }
  if (/输入|编辑区|搜索框|查询|字符输入|数值输入|遮蔽输入/.test(label)) {
    return "input, textarea, [role='combobox'], .demo-otp";
  }
  if (/菜单项|选项标签|导航项|祖先链接|页码链接|章节链接/.test(label)) {
    return "[role='menuitem'], [role='option'], [role='tab'], nav a, nav button, option";
  }
  if (/按钮|操作|控制|触发器|触发元素|触发链接|更多按钮|上一页|下一页/.test(label)) {
    return "button, [role='button'], a[href]";
  }
  if (/图标|标记|徽标|色样|图片|媒体|缩略图|前图|后图|图例/.test(label)) {
    return ".demo-icon, .demo-color-swatch, img, figure, svg, .demo-before, .demo-after, .demo-photo-thumb";
  }
  if (/状态|错误|帮助|说明|提示|数值|当前位置|位置指示|字数/.test(label)) {
    return "[role='status'], [role='alert'], output, .demo-status, small, p";
  }
  if (/标题|文字标签|短标签|可见标签|组标题/.test(label)) {
    return "h1, h2, h3, strong, label, [role='tab'], button";
  }
  if (/菜单/.test(label)) {
    return "[role='menu'], [role='listbox'], .demo-menu, .demo-popover";
  }
  if (/网格|表格|单元格|数据行|时间网格/.test(label)) {
    return "[role='grid'], table, [role='gridcell'], .demo-calendar-grid, .demo-data-grid";
  }
  if (/列表|节点|项目|内容流|选项/.test(label)) {
    return "[role='list'], [role='tree'], [role='treeitem'], [role='listbox'], ul, ol, .demo-list, .demo-feed";
  }
  if (/内容面板|详情面板|导航面板|边缘面板|弹出内容|内容区域|任务内容/.test(label)) {
    return "[role='tabpanel'], [role='dialog'], section, article, .demo-side-sheet, .demo-drawer, .demo-popover";
  }
  if (/容器|面板|视口|区域|画布|主内容|正文|内容|对象|背景层|前景层/.test(label)) {
    return ":scope > .demo-canvas > *";
  }
  return null;
}

export function getAnnotationGuides(
  slug: string,
  anatomy: readonly string[],
): readonly AnnotationGuide[] {
  const definitions = annotationDefinitions[slug];
  return [0, 1, 2].map((index) => {
    const id = index + 1;
    const label = anatomy[index] ?? `组成部分 ${id}`;
    const definition = definitions?.[index];
    return {
      id,
      label,
      description: definition?.description ?? genericDescription(label),
      selector: definition?.selector ?? semanticSelector(label),
      ...(definition?.placement ? { placement: definition.placement } : {}),
      ...(definition?.targetMode ? { targetMode: definition.targetMode } : {}),
    };
  });
}
