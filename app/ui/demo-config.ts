import type { DemoSlug } from "./DemoStage";

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
  selector: string;
  placement?: "left" | "right" | "top";
  targetMode?: "first" | "all" | "union";
}

type AnnotationDefinition = Omit<AnnotationGuide, "id" | "label" | "description"> & {
  description?: string;
};

type AnnotationTriplet = readonly [
  AnnotationDefinition,
  AnnotationDefinition,
  AnnotationDefinition,
];

const parts = (
  first: string,
  second: string,
  third: string,
): AnnotationTriplet => [
  { selector: first, targetMode: "union" },
  { selector: second, targetMode: "union" },
  { selector: third, targetMode: "union" },
];

const annotationDefinitions: Record<DemoSlug, AnnotationTriplet> = {
  "date-range-picker": parts(".modern-date-row label:first-child", ".modern-date-row label:last-child", ".modern-actions"),
  "time-field": parts(".modern-demo > input", ".modern-actions", ".modern-demo > p"),
  "multi-select": parts(".modern-demo > input", ".modern-options", ".modern-actions"),
  rating: parts(".modern-rating legend", ".modern-rating > div", ".modern-demo > p"),
  menubar: parts(".modern-menubar", "[data-menu-popup], .modern-editor", ".modern-demo > p"),
  questionnaire: parts(".modern-kicker", ".modern-options", ".modern-actions"),
  "chat-message": parts(".modern-message", ".modern-message-form", ".modern-demo > button"),
  "message-scroller": parts(".modern-transcript", ".modern-actions", ".modern-demo > p"),
  attachment: parts(".modern-attachment > div", ".modern-demo > button", ".modern-attachment > button"),
  "navigation-bar": parts(
    ".demo-navbar > strong",
    ".demo-navbar > .demo-nav-list > button",
    ".demo-navbar-actions",
  ),
  "sidebar-navigation": parts(
    ".demo-sidebar-layout > nav",
    ".demo-sidebar-layout > nav > strong",
    ".demo-sidebar-layout .demo-nav-list > button",
  ),
  "navigation-drawer": parts(
    ".demo-drawer-scene > .demo-primary",
    ".demo-drawer-scrim",
    ".demo-drawer",
  ),
  "bottom-navigation": parts(
    ".demo-bottom-nav",
    ".demo-bottom-nav .demo-icon",
    ".demo-bottom-nav .demo-nav-label",
  ),
  tabs: [
    {
      selector: '.demo-tabs [role="tablist"]',
      targetMode: "union",
      description: "标签列表把一组同级视图组织在同一个键盘导航范围内。",
    },
    {
      selector: '.demo-tabs [role="tab"]',
      targetMode: "union",
      description: "标签按钮切换当前项目，并通过选中状态说明哪个面板正在显示。",
    },
    {
      selector: '.demo-tabs [role="tabpanel"]',
      targetMode: "union",
      description: "内容面板承载当前标签对应的信息，并与活动标签保持关联。",
    },
  ],
  breadcrumb: parts(
    ".demo-breadcrumb",
    ".demo-breadcrumb a:not([aria-current])",
    ".demo-breadcrumb a[aria-current]",
  ),
  pagination: parts(
    ".demo-pagination > button:first-of-type",
    ".demo-pagination > button:not(:first-of-type):not(:last-of-type)",
    ".demo-pagination > button:last-of-type",
  ),
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
  "anchor-navigation": parts(
    ".demo-anchor-layout > nav a:not([aria-current])",
    ".demo-anchor-content section",
    ".demo-anchor-layout > nav a[aria-current]",
  ),
  "split-view": [
    {
      selector: ".demo-split-view > nav",
      targetMode: "union",
      description: "主面板保留列表或导航上下文，让用户不必离开当前工作区。",
    },
    {
      selector: '.demo-split-view > [role="separator"]',
      targetMode: "union",
      description: "分隔条可拖动或用方向键调整，并持续暴露当前面板比例。",
    },
    {
      selector: ".demo-split-view > section",
      targetMode: "union",
      description: "详情面板展示当前项目的内容，并随主面板选择即时更新。",
    },
  ],
  button: parts(
    ".demo-centered > .demo-primary",
    ".demo-centered > .demo-primary .demo-button-label",
    ".demo-centered > .demo-primary .demo-icon",
  ),
  "icon-button": parts(
    ".demo-centered > .demo-icon-button",
    ".demo-centered > .demo-icon-button > span",
    ".demo-centered > .demo-accessible-name",
  ),
  "button-group": parts(
    ".demo-button-group",
    '.demo-button-group button:not([aria-pressed="true"])',
    '.demo-button-group button[aria-pressed="true"]',
  ),
  "split-button": parts(
    ".demo-split-button > button:first-child",
    ".demo-split-button > button:last-child",
    ".demo-popup-wrap > .demo-menu",
  ),
  toolbar: parts(
    ".demo-toolbar",
    ".demo-toolbar > button",
    ".demo-toolbar > span:not(.demo-status)",
  ),
  "dropdown-menu": parts(
    ".demo-popup-wrap > .demo-primary",
    ".demo-popup-wrap > .demo-menu",
    '.demo-popup-wrap [role="menuitem"]',
  ),
  "context-menu": parts(
    ".demo-context-target",
    ".demo-context-wrap > .demo-menu",
    '.demo-context-wrap [role="menuitem"]',
  ),
  "overflow-menu": parts(
    ".demo-record-row > .demo-icon-button",
    ".demo-popup-wrap > .demo-menu",
    '.demo-popup-wrap [role="menuitem"]',
  ),
  "command-palette": parts(
    ".demo-command-scene > .demo-secondary",
    ".demo-command-input",
    '.demo-command-dialog [role="listbox"]',
  ),
  "text-field": parts(
    ".demo-field > span",
    ".demo-field > input",
    ".demo-form > .demo-status",
  ),
  textarea: parts(
    ".demo-field > span",
    ".demo-field > textarea",
    ".demo-field > small",
  ),
  "password-field": parts(
    ".demo-field > label",
    ".demo-input-action > input",
    ".demo-input-action > button",
  ),
  "search-field": parts(
    ".demo-search-box",
    ".demo-search-box > input",
    ".demo-search-box > button",
  ),
  spinbutton: parts(
    ".demo-spinbutton > input",
    ".demo-spinbutton > button",
    ".demo-field > small",
  ),
  "masked-input": parts(
    ".demo-field > span",
    ".demo-field > input",
    ".demo-field > small",
  ),
  "otp-input": parts(
    ".demo-otp > legend",
    ".demo-otp input",
    ".demo-otp > .demo-status",
  ),
  "tags-input": parts(
    ".demo-tags-box > .demo-tag",
    ".demo-tags-box > input",
    ".demo-tag > button",
  ),
  "file-upload": parts(
    ".demo-dropzone > .demo-secondary",
    ".demo-dropzone > small",
    ".demo-dropzone > strong",
  ),
  checkbox: parts(
    ".demo-check-box",
    ".demo-check-mark",
    ".demo-check-label",
  ),
  "radio-group": parts(
    ".demo-radio > legend",
    ".demo-radio input",
    ".demo-radio label > span",
  ),
  switch: parts(
    ".demo-setting-row > .demo-switch",
    ".demo-setting-row > .demo-switch > span",
    ".demo-setting-row > span:first-child",
  ),
  select: parts(
    ".demo-field > span",
    ".demo-field > select",
    ".demo-field > small",
  ),
  combobox: parts(
    ".demo-combobox input",
    ".demo-combobox > .demo-combobox-trigger",
    '.demo-combobox [role="listbox"]',
  ),
  "segmented-control": parts(
    ".demo-segments",
    '.demo-segments > button:not([aria-pressed="true"])',
    '.demo-segments > button[aria-pressed="true"]',
  ),
  slider: parts(
    ".demo-slider-track",
    ".demo-slider-fill",
    ".demo-slider-thumb",
  ),
  "range-slider": parts(
    ".demo-dual-range-track",
    ".demo-dual-range-thumb.is-low",
    ".demo-dual-range-thumb.is-high",
  ),
  "date-picker": [
    {
      selector: '[data-demo-part="1"]',
      targetMode: "union",
      placement: "left",
      description: "日期输入显示当前值，也保留直接键入日期的路径。",
    },
    {
      selector: '[data-demo-part="2"]',
      targetMode: "union",
      description: "日历触发器负责展开选择面板，并向辅助技术同步展开状态。",
    },
    {
      selector: '[data-demo-part="3"]',
      targetMode: "union",
      description: "日期网格按周组织日期，并应支持方向键移动与清楚的选中状态。",
    },
  ],
  "color-picker": parts(
    ".demo-color-swatch",
    '.demo-color-picker input[type="color"]',
    ".demo-color-picker > div > strong",
  ),
  alert: parts(
    ".demo-alert > .demo-icon",
    ".demo-alert > span:not(.demo-icon)",
    ".demo-alert > button",
  ),
  toast: parts(
    ".demo-toast",
    ".demo-toast > span:not(.demo-icon)",
    ".demo-toast > button",
  ),
  snackbar: parts(
    ".demo-snackbar > span",
    ".demo-snackbar > button",
    ".demo-snackbar",
  ),
  "inline-validation": parts(
    ".demo-field > input",
    ".demo-field > small",
    ".demo-field > span",
  ),
  "progress-bar": parts(
    ".demo-progress-track",
    ".demo-progress-fill",
    ".demo-progress-demo output",
  ),
  spinner: parts(
    ".demo-spinner",
    ".demo-spinner-label",
    ".demo-centered",
  ),
  "skeleton-screen": parts(
    ".demo-skeleton > span i",
    ".demo-skeleton > i",
    ".demo-skeleton",
  ),
  badge: parts(
    ".demo-badge",
    ".demo-badge-value",
    ".demo-bell",
  ),
  "empty-state": parts(
    ".demo-empty > strong",
    ".demo-empty > small",
    ".demo-empty > button",
  ),
  "focus-ring": [
    {
      selector: ".demo-focus-surface button",
      targetMode: "union",
      description: "可聚焦控件组成键盘导航顺序，并可用 Tab 逐一到达。",
    },
    {
      selector: ".demo-focus-outline",
      targetMode: "union",
      description: "外侧轮廓贴合当前控件但不改变布局，清楚标示键盘位置。",
    },
    {
      selector: ".demo-focus-surface",
      targetMode: "union",
      description: "对比背景让焦点轮廓在明暗界面中都保持足够可见。",
    },
  ],
  "progress-ring": [
    {
      selector: ".demo-progress-ring circle:first-of-type",
      targetMode: "union",
      description: "圆环轨道给出完整范围，作为当前进度弧线的视觉基准。",
    },
    {
      selector: ".demo-progress-ring circle:nth-of-type(2)",
      targetMode: "union",
      description: "进度弧线按完成比例填充，让变化方向和剩余量一眼可见。",
    },
    {
      selector: ".demo-progress-ring output",
      targetMode: "union",
      description: "数值标签提供精确结果，避免只依赖颜色或弧线长度传达进度。",
    },
  ],
  dialog: [
    {
      selector: ".demo-backdrop",
      targetMode: "union",
      description: "遮罩弱化背景内容，帮助用户把注意力留在当前任务。",
    },
    {
      selector: '.demo-dialog[role="dialog"]',
      targetMode: "union",
      description: "对话框容器建立独立任务边界，并在打开期间管理内部焦点。",
    },
    {
      selector: ".demo-dialog > strong, .demo-dialog > .demo-field, .demo-dialog > .demo-dialog-actions",
      targetMode: "union",
      description: "标题、内容和操作共同说明任务、收集输入，并提供明确的完成或取消路径。",
    },
  ],
  "alert-dialog": parts(
    ".demo-dialog.is-alert > strong",
    ".demo-dialog.is-alert > small",
    ".demo-dialog.is-alert > .demo-dialog-actions",
  ),
  popover: parts(
    ".demo-popup-wrap > .demo-primary",
    ".demo-popup-wrap",
    ".demo-popup-wrap > .demo-popover",
  ),
  tooltip: parts(
    ".demo-hover-region > .demo-icon-button",
    ".demo-hover-region > .demo-tooltip",
    ".demo-tooltip-arrow",
  ),
  "hover-card": parts(
    ".demo-hover-region > .demo-text-link",
    ".demo-hover-region > .demo-hover-card",
    ".demo-hover-card > span:last-child",
  ),
  "side-sheet": parts(
    ".demo-side-sheet",
    ".demo-side-sheet > div:first-child",
    ".demo-side-sheet > label, .demo-side-sheet > .demo-primary",
  ),
  accordion: parts(
    ".demo-accordion h3 button",
    ".demo-accordion h3 button > span:last-child",
    ".demo-accordion-panel",
  ),
  disclosure: parts(
    ".demo-disclosure > button",
    ".demo-disclosure .demo-chevron",
    ".demo-disclosure > div",
  ),
  lightbox: parts(
    ".demo-lightbox",
    ".demo-lightbox > figure",
    ".demo-lightbox > button",
  ),
  scrim: parts(
    ".demo-scrim-layer",
    ".demo-overlay-scene > .demo-primary",
    ".demo-scrim-card",
  ),
  card: parts(
    ".demo-content-card",
    ".demo-content-card > .demo-card-art, .demo-content-card strong",
    ".demo-content-card p, .demo-content-card > button",
  ),
  "list-item": parts(
    ".demo-list",
    ".demo-list button > span:nth-child(2)",
    ".demo-list button > span:first-child, .demo-list button > span:last-child",
  ),
  avatar: parts(
    ".demo-avatar-initials",
    ".demo-avatar-large",
    ".demo-avatar-status",
  ),
  chip: parts(
    ".demo-chip",
    ".demo-chip-label",
    ".demo-chip-icon",
  ),
  carousel: parts(
    ".demo-carousel > .demo-slide",
    ".demo-carousel > button",
    ".demo-carousel > .demo-dots",
  ),
  "image-gallery": parts(
    ".demo-gallery",
    ".demo-gallery > div:last-child > button",
    ".demo-gallery-caption",
  ),
  "truncated-text": parts(
    ".demo-truncated > p",
    ".demo-truncation-cue",
    ".demo-truncated > button",
  ),
  divider: parts(
    ".demo-divider-rule",
    ".demo-divider-example > span:first-child",
    ".demo-divider-example > span:last-child",
  ),
  "data-table": parts(
    ".demo-table-title",
    ".demo-table-scroll thead",
    ".demo-table-scroll tbody",
  ),
  "data-grid": parts(
    ".demo-data-grid-title",
    ".demo-data-grid-row.is-active-row",
    '.demo-data-grid [role="gridcell"][tabindex="0"]',
  ),
  "tree-view": parts(
    ".demo-tree",
    ".demo-tree > [role=treeitem]",
    '.demo-tree > [role="group"]',
  ),
  timeline: parts(
    ".demo-timeline-marker",
    ".demo-timeline-connector",
    ".demo-timeline-content",
  ),
  "calendar-view": parts(
    ".demo-calendar > div:first-child",
    ".demo-calendar-grid",
    ".demo-calendar-grid .has-event",
  ),
  chart: parts(
    ".demo-chart-heading",
    ".demo-bars",
    ".demo-bars > button, .demo-chart-heading .demo-status",
  ),
  "drag-and-drop": parts(
    ".demo-sortable > div",
    ".demo-sortable > div > span:first-child",
    ".demo-sortable > .demo-drop-hint",
  ),
  "infinite-scroll": parts(
    ".demo-feed > div",
    ".demo-feed > button",
    ".demo-feed > .demo-status",
  ),
  "lazy-loading": parts(
    ".demo-lazy-slot",
    ".demo-lazy > button",
    ".demo-lazy-content",
  ),
  marquee: parts(
    ".demo-marquee",
    ".demo-marquee > div",
    ".demo-motion-control > button",
  ),
  "parallax-scrolling": parts(
    ".demo-parallax-scroll",
    ".demo-parallax-scene > strong, .demo-parallax-scene > .orb-one",
    ".demo-parallax-scene > .orb-two, .demo-parallax-space",
  ),
  "scroll-snap": parts(
    ".demo-snap > div:first-child",
    ".demo-snap [data-snap-index]",
    ".demo-snap > .demo-dots",
  ),
  "pan-and-zoom": parts(
    ".demo-panzoom > div:first-child",
    ".demo-panzoom > div:first-child > span",
    '.demo-panzoom > [role="group"]',
  ),
  "before-after-slider": [
    {
      selector: ".demo-before",
      targetMode: "union",
      description: "前图与后图严格对齐，作为拖动比较时的一侧视觉基准。",
    },
    {
      selector: ".demo-after",
      targetMode: "union",
      description: "后图层随揭示位置显露，让同一区域的变化可以连续比较。",
    },
    {
      selector: ".demo-compare-control, .demo-compare-line, .demo-compare-handle",
      targetMode: "union",
      description: "分隔把手同时支持拖动和键盘调整，并清楚标示当前揭示位置。",
    },
  ],
} satisfies Record<DemoSlug, AnnotationTriplet>;

function genericDescription(label: string): string {
  return `“${label}”是这个组件的关键组成部分；观察它的位置、状态以及与相邻元素的关系。`;
}

export function getAnnotationGuides(
  slug: string,
  anatomy: readonly string[],
): readonly AnnotationGuide[] {
  const definitions = annotationDefinitions[slug as DemoSlug];
  if (!definitions) return [];
  return [0, 1, 2].map((index) => {
    const id = index + 1;
    const label = anatomy[index] ?? `组成部分 ${id}`;
    const definition = definitions[index];
    return {
      id,
      label,
      description: definition.description ?? genericDescription(label),
      selector: definition.selector,
      ...(definition.placement ? { placement: definition.placement } : {}),
      ...(definition.targetMode ? { targetMode: definition.targetMode } : {}),
    };
  });
}
