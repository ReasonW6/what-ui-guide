"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import "./demo-stage.css";

export type DemoDensity = "card" | "detail";

export type DemoProps = {
  density: DemoDensity;
};

export type DemoStageProps = DemoProps & {
  slug: string;
};

export const demoSlugs = [
  "navigation-bar",
  "sidebar-navigation",
  "navigation-drawer",
  "bottom-navigation",
  "tabs",
  "breadcrumb",
  "pagination",
  "progress-stepper",
  "anchor-navigation",
  "button",
  "icon-button",
  "button-group",
  "split-button",
  "toolbar",
  "dropdown-menu",
  "context-menu",
  "overflow-menu",
  "text-field",
  "textarea",
  "password-field",
  "search-field",
  "spinbutton",
  "masked-input",
  "otp-input",
  "tags-input",
  "file-upload",
  "checkbox",
  "radio-group",
  "switch",
  "select",
  "combobox",
  "segmented-control",
  "slider",
  "range-slider",
  "date-picker",
  "color-picker",
  "alert",
  "toast",
  "snackbar",
  "inline-validation",
  "progress-bar",
  "spinner",
  "skeleton-screen",
  "badge",
  "empty-state",
  "dialog",
  "alert-dialog",
  "popover",
  "tooltip",
  "hover-card",
  "side-sheet",
  "accordion",
  "disclosure",
  "lightbox",
  "card",
  "list-item",
  "avatar",
  "chip",
  "carousel",
  "image-gallery",
  "truncated-text",
  "data-table",
  "data-grid",
  "tree-view",
  "timeline",
  "calendar-view",
  "chart",
  "drag-and-drop",
  "infinite-scroll",
  "lazy-loading",
  "marquee",
  "parallax-scrolling",
  "scroll-snap",
  "pan-and-zoom",
  "before-after-slider",
] as const;

export type DemoSlug = (typeof demoSlugs)[number];

function Status({ children }: { children: ReactNode }) {
  return (
    <span className="demo-status" aria-live="polite">
      {children}
    </span>
  );
}

function MiniIcon({ children }: { children: ReactNode }) {
  return <span className="demo-icon" aria-hidden="true">{children}</span>;
}

function NavigationDemo({ slug, density }: DemoProps & { slug: DemoSlug }) {
  const labels = density === "detail" ? ["概览", "组件", "模式", "资源"] : ["首页", "组件", "资源"];
  const [active, setActive] = useState(labels[0]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(2);
  const [step, setStep] = useState(1);

  const navButtons = (vertical = false) => (
    <div className={vertical ? "demo-nav-list is-vertical" : "demo-nav-list"}>
      {labels.map((label, index) => (
        <button
          className={active === label ? "is-active" : ""}
          key={label}
          onClick={() => setActive(label)}
          type="button"
        >
          <MiniIcon>{["⌂", "◇", "☷", "◎"][index]}</MiniIcon>
          {label}
        </button>
      ))}
    </div>
  );

  switch (slug) {
    case "navigation-bar":
      return (
        <nav className="demo-navbar" aria-label="演示主导航">
          <strong><span className="demo-logo-dot" />设计笔记</strong>
          {navButtons()}
          <Status>{active}</Status>
        </nav>
      );
    case "sidebar-navigation":
      return (
        <div className="demo-sidebar-layout">
          <nav aria-label="演示侧边导航">
            <strong>工作台</strong>
            {navButtons(true)}
          </nav>
          <div className="demo-page-placeholder"><span>{active}</span><i /><i /><i /></div>
        </div>
      );
    case "navigation-drawer":
      return (
        <div className="demo-drawer-scene">
          <button className="demo-primary" onClick={() => setDrawerOpen(true)} type="button">
            <MiniIcon>☰</MiniIcon>打开导航抽屉
          </button>
          <div className={`demo-drawer ${drawerOpen ? "is-open" : ""}`} aria-hidden={!drawerOpen}>
            <button aria-label="关闭导航抽屉" className="demo-close" onClick={() => setDrawerOpen(false)} type="button">×</button>
            <strong>浏览</strong>
            {navButtons(true)}
          </div>
        </div>
      );
    case "bottom-navigation":
      return (
        <div className="demo-phone-surface">
          <div className="demo-phone-content">{active}<i /><i /></div>
          <nav className="demo-bottom-nav" aria-label="演示底部导航">{navButtons()}</nav>
        </div>
      );
    case "tabs":
      return (
        <div className="demo-tabs">
          <div role="tablist" aria-label="内容选项卡">
            {labels.slice(0, 3).map((label) => (
              <button aria-selected={active === label} className={active === label ? "is-active" : ""} key={label} onClick={() => setActive(label)} role="tab" type="button">{label}</button>
            ))}
          </div>
          <div className="demo-tab-panel" role="tabpanel"><strong>{active}</strong><span>这里显示“{active}”内容。</span></div>
        </div>
      );
    case "breadcrumb":
      return (
        <nav className="demo-breadcrumb" aria-label="面包屑">
          {["首页", "设计系统", "滑块"].map((label, index) => (
            <span key={label}>
              {index > 0 && <i aria-hidden="true">›</i>}
              <button aria-current={active === label ? "page" : undefined} onClick={() => setActive(label)} type="button">{label}</button>
            </span>
          ))}
          <Status>当前位置：{active}</Status>
        </nav>
      );
    case "pagination":
      return (
        <div className="demo-pagination" aria-label="分页">
          <button aria-label="上一页" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">‹</button>
          {[1, 2, 3, 4].map((item) => <button aria-current={page === item ? "page" : undefined} className={page === item ? "is-active" : ""} key={item} onClick={() => setPage(item)} type="button">{item}</button>)}
          <button aria-label="下一页" disabled={page === 4} onClick={() => setPage((value) => Math.min(4, value + 1))} type="button">›</button>
          {density === "detail" && <Status>第 {page} / 4 页</Status>}
        </div>
      );
    case "progress-stepper": {
      const steps = ["信息", "确认", "完成"];
      return (
        <div className="demo-stepper">
          <ol>
            {steps.map((label, index) => <li className={index <= step ? "is-active" : ""} key={label}><button aria-current={index === step ? "step" : undefined} onClick={() => setStep(index)} type="button"><span>{index < step ? "✓" : index + 1}</span>{label}</button></li>)}
          </ol>
          {density === "detail" && <button className="demo-primary" onClick={() => setStep((value) => Math.min(2, value + 1))} type="button">下一步</button>}
        </div>
      );
    }
    case "anchor-navigation":
      return (
        <div className="demo-anchor-layout">
          <nav aria-label="页内目录">
            {["简介", "结构", "用法"].map((label) => <button aria-current={active === label ? "location" : undefined} className={active === label ? "is-active" : ""} key={label} onClick={() => setActive(label)} type="button">{label}</button>)}
          </nav>
          <div><small>当前章节</small><strong>{active}</strong><p>选择目录即可定位内容。</p></div>
        </div>
      );
    default:
      return null;
  }
}

function ActionDemo({ slug, density }: DemoProps & { slug: DemoSlug }) {
  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState("左对齐");
  const [menuOpen, setMenuOpen] = useState(
    density === "card" && ["split-button", "dropdown-menu", "context-menu", "overflow-menu"].includes(slug),
  );
  const [favorite, setFavorite] = useState(false);
  const actions = ["复制链接", "移动到…", "加入收藏"];
  const choose = (value: string) => {
    setSelected(value);
    setMenuOpen(false);
  };

  const popup = menuOpen && (
    <div className="demo-menu" role="menu">
      {actions.map((action) => <button key={action} onClick={() => choose(action)} role="menuitem" type="button">{action}</button>)}
    </div>
  );

  switch (slug) {
    case "button":
      return <div className="demo-centered"><button className="demo-primary" onClick={() => setCount((value) => value + 1)} type="button">开始探索</button><Status>{count ? `已点击 ${count} 次` : "试着点击按钮"}</Status></div>;
    case "icon-button":
      return <div className="demo-centered"><button aria-label={favorite ? "取消收藏" : "收藏"} className={`demo-icon-button ${favorite ? "is-active" : ""}`} onClick={() => setFavorite((value) => !value)} type="button">{favorite ? "♥" : "♡"}</button><Status>{favorite ? "已收藏" : "收藏这个项目"}</Status></div>;
    case "button-group":
      return (
        <div className="demo-centered">
          <div className="demo-button-group" role="group" aria-label="文本对齐">
            {["左对齐", "居中", "右对齐"].map((label, index) => <button aria-pressed={selected === label} className={selected === label ? "is-active" : ""} key={label} onClick={() => setSelected(label)} type="button">{["≡", "≡", "≡"][index]}<span className="sr-only">{label}</span></button>)}
          </div>
          <Status>{selected}</Status>
        </div>
      );
    case "split-button":
      return (
        <div className="demo-popup-wrap">
          <div className="demo-split-button"><button onClick={() => setCount((value) => value + 1)} type="button">发布</button><button aria-expanded={menuOpen} aria-label="更多发布选项" onClick={() => setMenuOpen((value) => !value)} type="button">⌄</button></div>
          {popup}
          <Status>{count ? "已模拟发布" : selected}</Status>
        </div>
      );
    case "toolbar":
      return (
        <div className="demo-toolbar" role="toolbar" aria-label="文本格式">
          {["粗体", "斜体", "链接"].map((label, index) => <button aria-pressed={selected === label} className={selected === label ? "is-active" : ""} key={label} onClick={() => setSelected(label)} type="button">{["B", "I", "↗"][index]}</button>)}
          <span />
          {density === "detail" && <button onClick={() => setSelected("已撤销")} type="button">↶</button>}
          <Status>{selected}</Status>
        </div>
      );
    case "dropdown-menu":
      return <div className="demo-popup-wrap"><button aria-expanded={menuOpen} className="demo-primary" onClick={() => setMenuOpen((value) => !value)} type="button">操作 <span>⌄</span></button>{popup}<Status>{selected}</Status></div>;
    case "context-menu":
      return (
        <div className="demo-popup-wrap demo-context-wrap">
          <button
            className="demo-context-target"
            onClick={() => setMenuOpen(true)}
            onContextMenu={(event) => { event.preventDefault(); setMenuOpen(true); }}
            type="button"
          >
            <span>文件：研究笔记.md</span><small>点击或右键打开菜单</small>
          </button>
          {popup}
          <Status>{selected}</Status>
        </div>
      );
    case "overflow-menu":
      return <div className="demo-popup-wrap"><div className="demo-record-row"><span className="demo-avatar-small">UI</span><span><strong>组件词典</strong><small>刚刚更新</small></span><button aria-expanded={menuOpen} aria-label="更多操作" className="demo-icon-button" onClick={() => setMenuOpen((value) => !value)} type="button">•••</button></div>{popup}</div>;
    default:
      return null;
  }
}

function InputDemo({ slug, density }: DemoProps & { slug: DemoSlug }) {
  const [text, setText] = useState("");
  const [number, setNumber] = useState(3);
  const [showPassword, setShowPassword] = useState(false);
  const [tags, setTags] = useState(["UI", "React"]);
  const [fileReady, setFileReady] = useState(false);
  const [otp, setOtp] = useState(["2", "", "", ""]);
  const suggestions = ["Slider 滑块", "Side sheet 侧边面板", "Skeleton 骨架屏"].filter((item) => item.toLowerCase().includes(text.toLowerCase()));
  const masked = text.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d{0,4})(\d{0,4})/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" "));

  const field = (options: { label: string; placeholder: string; type?: string }) => (
    <label className="demo-field"><span>{options.label}</span><input onChange={(event) => setText(event.target.value)} placeholder={options.placeholder} type={options.type ?? "text"} value={text} />{density === "detail" && <small>{text.length}/40</small>}</label>
  );

  switch (slug) {
    case "text-field":
      return <div className="demo-form">{field({ label: "显示名称", placeholder: "例如：林间产品团队" })}<Status>{text ? `你好，${text}` : "请输入文本"}</Status></div>;
    case "textarea":
      return <label className="demo-field"><span>补充说明</span><textarea maxLength={160} onChange={(event) => setText(event.target.value)} placeholder="写下你的想法…" rows={density === "detail" ? 4 : 3} value={text} /><small>{text.length}/160</small></label>;
    case "password-field":
      return <div className="demo-form"><label className="demo-field"><span>密码</span><span className="demo-input-action"><input onChange={(event) => setText(event.target.value)} placeholder="至少 8 位" type={showPassword ? "text" : "password"} value={text} /><button aria-label={showPassword ? "隐藏密码" : "显示密码"} onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? "隐藏" : "显示"}</button></span></label><div className="demo-strength"><i className={text.length > 2 ? "is-on" : ""} /><i className={text.length > 5 ? "is-on" : ""} /><i className={text.length > 7 ? "is-on" : ""} /></div></div>;
    case "search-field":
      return (
        <div className="demo-search-demo">
          <label className="demo-search-box"><MiniIcon>⌕</MiniIcon><span className="sr-only">搜索组件</span><input onChange={(event) => setText(event.target.value)} placeholder="搜索组件…" type="search" value={text} /></label>
          <div className="demo-suggestions">{(text ? suggestions : suggestions.slice(0, 2)).map((item) => <button key={item} onClick={() => setText(item.split(" ")[0])} type="button">{item}</button>)}</div>
        </div>
      );
    case "spinbutton":
      return <label className="demo-field"><span>参会人数</span><span className="demo-spinbutton"><button aria-label="减少" onClick={() => setNumber((value) => Math.max(0, value - 1))} type="button">−</button><input aria-label="参会人数" max={20} min={0} onChange={(event) => setNumber(Number(event.target.value))} type="number" value={number} /><button aria-label="增加" onClick={() => setNumber((value) => Math.min(20, value + 1))} type="button">＋</button></span><small>当前 {number} 人</small></label>;
    case "masked-input":
      return <label className="demo-field"><span>手机号码</span><input inputMode="numeric" onChange={(event) => setText(event.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="138 0000 0000" value={masked} /><small>{text.length === 11 ? "格式完整" : "将自动分组"}</small></label>;
    case "otp-input":
      return (
        <fieldset className="demo-otp"><legend>输入 4 位验证码</legend><div>{otp.map((value, index) => <input aria-label={`第 ${index + 1} 位`} inputMode="numeric" key={index} maxLength={1} onChange={(event) => setOtp((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value.replace(/\D/g, "") : item))} value={value} />)}</div><Status>{otp.every(Boolean) ? "验证码已填完整" : "依次填写数字"}</Status></fieldset>
      );
    case "tags-input":
      return (
        <div className="demo-form"><label className="demo-field"><span>关键词</span><span className="demo-tags-box">{tags.map((tag) => <button aria-label={`移除 ${tag}`} key={tag} onClick={() => setTags((items) => items.filter((item) => item !== tag))} type="button">{tag} ×</button>)}<input onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && text.trim()) { event.preventDefault(); setTags((items) => [...items, text.trim()]); setText(""); } }} placeholder="添加标签" value={text} /></span></label><button className="demo-secondary" disabled={!text.trim()} onClick={() => { setTags((items) => [...items, text.trim()]); setText(""); }} type="button">添加</button></div>
      );
    case "file-upload":
      return <div className={`demo-dropzone ${fileReady ? "is-ready" : ""}`}><MiniIcon>{fileReady ? "✓" : "⇧"}</MiniIcon><strong>{fileReady ? "原型图.png" : "拖放文件到这里"}</strong><small>{fileReady ? "仅作本地演示，未上传" : "PNG、JPG，最大 10 MB"}</small><button className="demo-secondary" onClick={() => setFileReady((value) => !value)} type="button">{fileReady ? "移除演示文件" : "模拟选择文件"}</button></div>;
    default:
      return null;
  }
}

function SelectionDemo({ slug, density }: DemoProps & { slug: DemoSlug }) {
  const [checked, setChecked] = useState(true);
  const [choice, setChoice] = useState("自动");
  const [value, setValue] = useState(62);
  const [secondValue, setSecondValue] = useState(84);
  const [color, setColor] = useState("#0a6cff");
  const [query, setQuery] = useState(density === "card" && slug === "combobox" ? "sl" : "");
  const options = ["自动", "Web", "Mobile"];
  const matches = ["Slider · 滑块", "Range slider · 范围滑块", "Switch · 开关"].filter((item) => item.toLowerCase().includes(query.toLowerCase()));

  switch (slug) {
    case "checkbox":
      return <label className="demo-check"><input checked={checked} onChange={(event) => setChecked(event.target.checked)} type="checkbox" /><span>接收每周组件灵感</span><Status>{checked ? "已订阅" : "未订阅"}</Status></label>;
    case "radio-group":
      return <fieldset className="demo-radio"><legend>预览设备</legend>{options.map((item) => <label key={item}><input checked={choice === item} name="device" onChange={() => setChoice(item)} type="radio" /><span>{item}</span></label>)}<Status>{choice}</Status></fieldset>;
    case "switch":
      return <div className="demo-setting-row"><span><strong>深色模式</strong><small>跟随你的阅读偏好</small></span><button aria-checked={checked} className={`demo-switch ${checked ? "is-on" : ""}`} onClick={() => setChecked((state) => !state)} role="switch" type="button"><span /></button></div>;
    case "select":
      return <label className="demo-field"><span>平台</span><select onChange={(event) => setChoice(event.target.value)} value={choice}>{options.map((item) => <option key={item}>{item}</option>)}</select><small>已选择：{choice}</small></label>;
    case "combobox":
      return (
        <div className="demo-combobox"><label className="demo-field"><span>查找组件</span><input aria-autocomplete="list" aria-controls="combo-list" aria-expanded={Boolean(query)} onChange={(event) => setQuery(event.target.value)} placeholder="输入 slider…" role="combobox" value={query} /></label>{query && <div id="combo-list" role="listbox">{matches.map((item) => <button aria-selected={query === item} key={item} onClick={() => setQuery(item)} role="option" type="button">{item}</button>)}</div>}</div>
      );
    case "segmented-control":
      return <div className="demo-centered"><div className="demo-segments" role="group" aria-label="视图模式">{["卡片", "列表", "紧凑"].map((item) => <button aria-pressed={choice === item} className={choice === item ? "is-active" : ""} key={item} onClick={() => setChoice(item)} type="button">{item}</button>)}</div><Status>{choice}视图</Status></div>;
    case "slider":
      return <label className="demo-range"><span><strong>音量</strong><output>{value}%</output></span><input max="100" min="0" onChange={(event) => setValue(Number(event.target.value))} type="range" value={value} />{density === "detail" && <div className="demo-range-scale"><span>静音</span><span>最大</span></div>}</label>;
    case "range-slider": {
      const low = Math.min(value, secondValue);
      const high = Math.max(value, secondValue);
      return <div className="demo-range"><span><strong>价格范围</strong><output>¥{low} – ¥{high}</output></span><div className="demo-dual-range"><input aria-label="最低价格" max="100" min="0" onChange={(event) => setValue(Math.min(Number(event.target.value), secondValue))} type="range" value={low} /><input aria-label="最高价格" max="100" min="0" onChange={(event) => setSecondValue(Math.max(Number(event.target.value), value))} type="range" value={high} /></div></div>;
    }
    case "date-picker":
      return <label className="demo-field"><span>选择日期</span><input onChange={(event) => setChoice(event.target.value)} type="date" value={choice.match(/^\d/) ? choice : "2026-07-14"} /><small>{choice.match(/^\d/) ? choice : "2026-07-14"}</small></label>;
    case "color-picker":
      return <div className="demo-color-picker"><label><span className="sr-only">选择颜色</span><input onChange={(event) => setColor(event.target.value)} type="color" value={color} /></label><div><strong>{color.toUpperCase()}</strong><span className="demo-color-swatch" style={{ backgroundColor: color }} /></div>{density === "detail" && <div className="demo-color-presets">{["#0a6cff", "#af52de", "#28cd41", "#ff9500"].map((item) => <button aria-label={`使用颜色 ${item}`} key={item} onClick={() => setColor(item)} style={{ backgroundColor: item }} type="button" />)}</div>}</div>;
    default:
      return null;
  }
}

function FeedbackDemo({ slug }: DemoProps & { slug: DemoSlug }) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(42);
  const [text, setText] = useState("ui.example");
  const [count, setCount] = useState(3);

  const showButton = <button className="demo-primary" onClick={() => setVisible(true)} type="button">显示提示</button>;

  switch (slug) {
    case "alert":
      return visible ? <div className="demo-alert" role="alert"><MiniIcon>i</MiniIcon><span><strong>新的组件已收录</strong><small>你可以在反馈与状态中找到它。</small></span><button aria-label="关闭提示" onClick={() => setVisible(false)} type="button">×</button></div> : <div className="demo-centered">{showButton}</div>;
    case "toast":
      return <div className="demo-notification-scene">{showButton}{visible && <div className="demo-toast" role="status"><MiniIcon>✓</MiniIcon><span>链接已复制</span><button aria-label="关闭" onClick={() => setVisible(false)} type="button">×</button></div>}</div>;
    case "snackbar":
      return <div className="demo-notification-scene"><button className="demo-secondary" onClick={() => setVisible(true)} type="button">归档项目</button>{visible && <div className="demo-snackbar" role="status"><span>项目已归档</span><button onClick={() => setVisible(false)} type="button">撤销</button></div>}</div>;
    case "inline-validation": {
      const invalid = text.length > 0 && !text.includes(".");
      return <label className={`demo-field ${invalid ? "has-error" : ""}`}><span>个人网址</span><input aria-describedby="url-hint" aria-invalid={invalid} onChange={(event) => setText(event.target.value)} value={text} /><small id="url-hint">{invalid ? "请输入包含点号的域名" : "网址格式正确"}</small></label>;
    }
    case "progress-bar":
      return <div className="demo-progress-demo"><div><strong>正在导入组件</strong><output>{progress}%</output></div><progress max="100" value={progress}>{progress}%</progress><button className="demo-secondary" onClick={() => setProgress((value) => value >= 100 ? 0 : Math.min(100, value + 14))} type="button">推进进度</button></div>;
    case "spinner":
      return <div className="demo-centered"><button className="demo-primary" onClick={() => setVisible((value) => !value)} type="button">{visible ? "停止加载" : "开始加载"}</button>{visible && <span className="demo-spinner" role="status"><span className="sr-only">加载中</span></span>}</div>;
    case "skeleton-screen":
      return <div className="demo-skeleton-wrap"><button className="demo-secondary" onClick={() => setVisible((value) => !value)} type="button">{visible ? "显示内容" : "重新加载"}</button>{visible ? <div className="demo-skeleton" aria-label="内容加载中"><i /><span><i /><i /><i /></span></div> : <div className="demo-loaded-card"><span className="demo-avatar-small">UI</span><span><strong>滑块 Slider</strong><small>拖动圆点选择数值</small></span></div>}</div>;
    case "badge":
      return <div className="demo-centered"><button className="demo-bell" onClick={() => setCount((value) => (value + 1) % 10)} type="button"><span aria-hidden="true">♢</span><span className="demo-badge">{count}</span><span className="sr-only">通知，{count} 条</span></button><Status>点击增加通知</Status></div>;
    case "empty-state":
      return count ? <div className="demo-empty"><span aria-hidden="true">⌁</span><strong>还没有收藏</strong><small>收藏的组件会出现在这里。</small><button className="demo-primary" onClick={() => setCount(0)} type="button">模拟收藏一个</button></div> : <div className="demo-loaded-card"><span className="demo-avatar-small">✓</span><span><strong>已收藏 Slider</strong><small>你的第一个收藏</small></span><button aria-label="清空收藏" onClick={() => setCount(1)} type="button">×</button></div>;
    default:
      return null;
  }
}

function OverlayDemo({ slug, density }: DemoProps & { slug: DemoSlug }) {
  const previewOpen = density === "card" && [
    "dialog",
    "alert-dialog",
    "popover",
    "tooltip",
    "hover-card",
    "side-sheet",
    "lightbox",
  ].includes(slug);
  const [open, setOpen] = useState(previewOpen || slug === "accordion" || slug === "disclosure");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openedOnce = useRef(false);

  useEffect(() => {
    if (density === "detail" && open && !["accordion", "disclosure", "tooltip", "hover-card"].includes(slug)) {
      openedOnce.current = true;
      panelRef.current?.focus();
    } else if (density === "detail" && !open && openedOnce.current) {
      triggerRef.current?.focus();
      openedOnce.current = false;
    }
  }, [density, open, slug]);

  const handleEscape = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
    }
  };
  const trigger = (label = "打开演示") => <button aria-expanded={open} className="demo-primary" onClick={() => setOpen(true)} ref={triggerRef} type="button">{label}</button>;

  switch (slug) {
    case "dialog":
      return <div className="demo-overlay-scene" onKeyDown={handleEscape}>{trigger("编辑资料")}{open && <div className="demo-backdrop"><div aria-labelledby="dialog-title" className="demo-dialog" ref={panelRef} role="dialog" tabIndex={-1}><strong id="dialog-title">编辑资料</strong><label className="demo-field"><span>显示名称</span><input defaultValue="林间团队" /></label><div className="demo-dialog-actions"><button onClick={() => setOpen(false)} type="button">取消</button><button className="demo-primary" onClick={() => setOpen(false)} type="button">保存</button></div></div></div>}</div>;
    case "alert-dialog":
      return <div className="demo-overlay-scene" onKeyDown={handleEscape}>{trigger("移除项目")}{open && <div className="demo-backdrop"><div aria-describedby="alert-copy" aria-labelledby="alert-title" className="demo-dialog is-alert" ref={panelRef} role="alertdialog" tabIndex={-1}><span className="demo-warning">!</span><strong id="alert-title">移除这个项目？</strong><small id="alert-copy">这是模拟操作，不会删除任何内容。</small><div className="demo-dialog-actions"><button onClick={() => setOpen(false)} type="button">取消</button><button className="demo-danger" onClick={() => setOpen(false)} type="button">确认移除</button></div></div></div>}</div>;
    case "popover":
      return <div className="demo-overlay-scene demo-popup-wrap" onKeyDown={handleEscape}>{trigger("查看详情")}{open && <div className="demo-popover" ref={panelRef} role="dialog" tabIndex={-1}><strong>Slider · 滑块</strong><p>沿轨道拖动圆点，选择一个数值。</p><button onClick={() => setOpen(false)} type="button">知道了</button></div>}</div>;
    case "tooltip":
      return <div className="demo-overlay-scene"><button aria-describedby={open ? "tooltip-content" : undefined} className="demo-icon-button" onBlur={() => setOpen(false)} onClick={() => setOpen((value) => !value)} onFocus={() => setOpen(true)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} ref={triggerRef} type="button">?</button>{open && <div className="demo-tooltip" id="tooltip-content" role="tooltip">查看术语解释</div>}</div>;
    case "hover-card":
      return <div className="demo-overlay-scene"><button className="demo-text-link" onBlur={() => setOpen(false)} onClick={() => setOpen((value) => !value)} onFocus={() => setOpen(true)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} ref={triggerRef} type="button">@design-system</button>{open && <div className="demo-hover-card"><span className="demo-avatar-small">DS</span><span><strong>Design System</strong><small>收录 75 个常用组件</small></span></div>}</div>;
    case "side-sheet":
      return <div className="demo-overlay-scene" onKeyDown={handleEscape}>{trigger("打开设置")}{open && <div className="demo-side-sheet" ref={panelRef} role="dialog" tabIndex={-1}><div><strong>页面设置</strong><button aria-label="关闭" onClick={() => setOpen(false)} type="button">×</button></div><label className="demo-check"><input defaultChecked type="checkbox" />显示网格</label><label className="demo-check"><input type="checkbox" />紧凑模式</label>{density === "detail" && <button className="demo-primary" onClick={() => setOpen(false)} type="button">应用</button>}</div>}</div>;
    case "accordion":
      return <div className="demo-accordion">{["什么是 Slider？", "何时使用？"].slice(0, density === "detail" ? 2 : 1).map((label, index) => <div key={label}><button aria-expanded={index === 0 && open} onClick={() => index === 0 && setOpen((value) => !value)} type="button"><strong>{label}</strong><span>{index === 0 && open ? "−" : "+"}</span></button>{index === 0 && open && <p>一种让用户在连续范围内选择数值的输入控件。</p>}</div>)}</div>;
    case "disclosure":
      return <div className="demo-disclosure"><button aria-expanded={open} onClick={() => setOpen((value) => !value)} type="button"><span className={`demo-chevron ${open ? "is-open" : ""}`}>›</span><strong>显示高级选项</strong></button>{open && <div><label className="demo-check"><input defaultChecked type="checkbox" />启用键盘步进</label>{density === "detail" && <label className="demo-field"><span>步长</span><input defaultValue="5" type="number" /></label>}</div>}</div>;
    case "lightbox":
      return <div className="demo-overlay-scene" onKeyDown={handleEscape}><button aria-label="放大图片" className="demo-photo-thumb" onClick={() => setOpen(true)} ref={triggerRef} type="button"><span>UI</span><small>点击放大</small></button>{open && <div className="demo-lightbox" ref={panelRef} role="dialog" tabIndex={-1}><button aria-label="关闭灯箱" onClick={() => setOpen(false)} type="button">×</button><div><span>UI</span><small>组件图鉴封面</small></div></div>}</div>;
    default:
      return null;
  }
}

function ContentDemo({ slug, density }: DemoProps & { slug: DemoSlug }) {
  const [active, setActive] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const slides = ["Slider", "Dialog", "Toast"];

  switch (slug) {
    case "card":
      return <article className="demo-content-card"><div className="demo-card-art"><span>UI</span></div><div><small>选择与取值</small><strong>Slider · 滑块</strong><p>拖动圆点选择范围中的值。</p></div><button aria-label={favorite ? "取消收藏" : "收藏卡片"} onClick={() => setFavorite((value) => !value)} type="button">{favorite ? "♥" : "♡"}</button></article>;
    case "list-item":
      return <div className="demo-list" role="list">{["Slider", "Dialog", "Toast"].slice(0, density === "detail" ? 3 : 2).map((item, index) => <button className={active === index ? "is-active" : ""} key={item} onClick={() => setActive(index)} role="listitem" type="button"><span className="demo-avatar-small">{item.slice(0, 1)}</span><span><strong>{item}</strong><small>{["连续数值输入", "聚焦式浮层", "短暂状态反馈"][index]}</small></span><span>›</span></button>)}</div>;
    case "avatar":
      return <div className="demo-centered"><button aria-label="切换在线状态" className={`demo-avatar-large ${favorite ? "is-away" : ""}`} onClick={() => setFavorite((value) => !value)} type="button">LX<span /></button><strong>林小夏</strong><Status>{favorite ? "离开" : "在线"}</Status></div>;
    case "chip":
      return <div className="demo-centered"><button aria-pressed={favorite} className={`demo-chip ${favorite ? "is-active" : ""}`} onClick={() => setFavorite((value) => !value)} type="button"><span>●</span>无障碍{favorite ? " ✓" : ""}</button><Status>{favorite ? "筛选已启用" : "点击筛选"}</Status></div>;
    case "carousel":
      return <div className="demo-carousel"><div className={`demo-slide tone-${active}`}><small>组件 {active + 1} / {slides.length}</small><strong>{slides[active]}</strong></div><button aria-label="上一张" onClick={() => setActive((value) => (value - 1 + slides.length) % slides.length)} type="button">‹</button><button aria-label="下一张" onClick={() => setActive((value) => (value + 1) % slides.length)} type="button">›</button><div className="demo-dots">{slides.map((item, index) => <button aria-label={`查看 ${item}`} className={active === index ? "is-active" : ""} key={item} onClick={() => setActive(index)} type="button" />)}</div></div>;
    case "image-gallery":
      return <div className="demo-gallery"><div className={`demo-gallery-main tone-${active}`}><span>{["A", "B", "C"][active]}</span></div><div>{[0, 1, 2].map((item) => <button aria-label={`查看图片 ${item + 1}`} aria-pressed={active === item} className={`tone-${item} ${active === item ? "is-active" : ""}`} key={item} onClick={() => setActive(item)} type="button"><span>{["A", "B", "C"][item]}</span></button>)}</div></div>;
    case "truncated-text":
      return <div className="demo-truncated"><p className={expanded ? "is-expanded" : ""}>设计系统中的组件名称常常因平台而异。理解标准术语，可以更准确地检索文档、描述需求，也能让 AI 更快理解你想实现的交互效果。</p><button className="demo-text-link" onClick={() => setExpanded((value) => !value)} type="button">{expanded ? "收起" : "显示更多"}</button></div>;
    default:
      return null;
  }
}

function DataDemo({ slug, density }: DemoProps & { slug: DemoSlug }) {
  const [active, setActive] = useState(1);
  const [ascending, setAscending] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const values = ascending ? [28, 54, 76] : [76, 54, 28];
  const rows = [
    ["Slider", "输入", "Web"],
    ["Dialog", "浮层", "通用"],
    ["Toast", "反馈", "Web"],
  ];

  switch (slug) {
    case "data-table":
      return <div className="demo-table-scroll"><table><caption className="sr-only">组件数据表</caption><thead><tr><th><button onClick={() => setAscending((value) => !value)} type="button">组件 {ascending ? "↑" : "↓"}</button></th><th>类型</th><th>平台</th></tr></thead><tbody>{(ascending ? rows : [...rows].reverse()).slice(0, density === "detail" ? 3 : 2).map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div>;
    case "data-grid":
      return <div className="demo-data-grid" role="grid" aria-label="可编辑组件数据">{["名称", "评分", "状态", "Slider", "9.4", "推荐", "Dialog", "9.1", "常用"].map((cell, index) => index < 3 ? <div className="is-heading" key={cell} role="columnheader">{cell}</div> : <button aria-selected={active === index} className={active === index ? "is-active" : ""} key={`${cell}-${index}`} onClick={() => setActive(index)} role="gridcell" type="button">{cell}</button>)}</div>;
    case "tree-view":
      return <div className="demo-tree" role="tree"><button aria-expanded={expanded} aria-selected={false} onClick={() => setExpanded((value) => !value)} role="treeitem" type="button"><span>{expanded ? "⌄" : "›"}</span>组件</button>{expanded && <div role="group"><button aria-selected={active === 1} className={active === 1 ? "is-active" : ""} onClick={() => setActive(1)} role="treeitem" type="button">选择与取值</button><button aria-selected={active === 2} className={active === 2 ? "is-active" : ""} onClick={() => setActive(2)} role="treeitem" type="button">反馈与状态</button></div>}</div>;
    case "timeline":
      return <div className="demo-timeline">{["创建词条", "补充演示", "发布上线"].map((item, index) => <button className={index <= active ? "is-active" : ""} key={item} onClick={() => setActive(index)} type="button"><span>{index < active ? "✓" : index + 1}</span><span><strong>{item}</strong><small>{["09:20", "10:45", "待完成"][index]}</small></span></button>)}</div>;
    case "calendar-view": {
      const days = Array.from({ length: 14 }, (_, index) => index + 7);
      return <div className="demo-calendar"><div><button aria-label="上个月" type="button">‹</button><strong>2026 年 7 月</strong><button aria-label="下个月" type="button">›</button></div><div className="demo-calendar-grid">{days.map((day) => <button aria-pressed={active === day} className={active === day ? "is-active" : ""} key={day} onClick={() => setActive(day)} type="button">{day}</button>)}</div><Status>7 月 {active} 日</Status></div>;
    }
    case "chart":
      return <div className="demo-chart"><div className="demo-chart-heading"><span><strong>组件浏览量</strong><small>本周</small></span><Status>{values[active] ?? values[1]}k</Status></div><div className="demo-bars" role="img" aria-label="组件浏览量柱状图">{values.map((value, index) => <button aria-label={`第 ${index + 1} 项，${value}k`} className={active === index ? "is-active" : ""} key={value} onClick={() => setActive(index)} style={{ height: `${value}%` }} type="button"><span>{value}k</span></button>)}</div></div>;
    default:
      return null;
  }
}

function MotionDemo({ slug }: DemoProps & { slug: DemoSlug }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [items, setItems] = useState(["Slider", "Dialog", "Toast"]);
  const [loaded, setLoaded] = useState(2);
  const [zoom, setZoom] = useState(1);
  const [compare, setCompare] = useState(48);

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = Math.max(0, Math.min(items.length - 1, index + direction));
    if (nextIndex === index) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setActive(nextIndex);
  };

  switch (slug) {
    case "drag-and-drop":
      return <div className="demo-sortable"><small>拖动，或用箭头排序</small>{items.map((item, index) => <div className={active === index ? "is-active" : ""} draggable key={item} onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const from = Number(event.dataTransfer.getData("text/plain")); if (Number.isInteger(from)) move(from, index > from ? 1 : -1); }}><span aria-hidden="true">⠿</span><strong>{item}</strong><span><button aria-label={`上移 ${item}`} disabled={index === 0} onClick={() => move(index, -1)} type="button">↑</button><button aria-label={`下移 ${item}`} disabled={index === items.length - 1} onClick={() => move(index, 1)} type="button">↓</button></span></div>)}</div>;
    case "infinite-scroll":
      return <div className="demo-feed"><div>{Array.from({ length: loaded }, (_, index) => <article key={index}><span className="demo-avatar-small">{index + 1}</span><span><strong>{["Slider 设计要点", "Dialog 的焦点管理", "新增组件条目", "键盘操作清单"][index]}</strong><small>阅读 2 分钟</small></span></article>)}</div><button className="demo-secondary" disabled={loaded >= 4} onClick={() => setLoaded((value) => Math.min(4, value + 1))} type="button">{loaded >= 4 ? "已加载全部" : "继续加载"}</button></div>;
    case "lazy-loading":
      return <div className="demo-lazy"><div className={loaded > 2 ? "is-loaded" : ""}>{loaded > 2 ? <><span>UI</span><small>图片内容已显示</small></> : <><i /><i /><small>内容尚未进入视口</small></>}</div><button className="demo-primary" onClick={() => setLoaded((value) => value > 2 ? 2 : 3)} type="button">{loaded > 2 ? "卸载演示" : "模拟进入视口"}</button></div>;
    case "marquee":
      return <div className="demo-motion-control"><div className={`demo-marquee ${paused ? "is-paused" : ""}`}><div>{["Slider", "Dialog", "Toast", "Carousel", "Slider", "Dialog", "Toast", "Carousel"].map((item, index) => <span key={`${item}-${index}`}>{item} <i>◆</i></span>)}</div></div><button className="demo-secondary" onClick={() => setPaused((value) => !value)} type="button">{paused ? "继续滚动" : "暂停滚动"}</button></div>;
    case "parallax-scrolling":
      return <div className="demo-parallax"><div><span className="demo-orb orb-one" style={{ transform: `translateY(${active * -0.25}px)` }} /><span className="demo-orb orb-two" style={{ transform: `translateY(${active * 0.4}px)` }} /><strong style={{ transform: `translateY(${active * -0.1}px)` }}>层叠滚动</strong><small>不同图层以不同速度移动</small></div><label><span>滚动位置</span><input max="60" min="-60" onChange={(event) => setActive(Number(event.target.value))} type="range" value={active} /></label></div>;
    case "scroll-snap":
      return <div className="demo-snap"><div>{["Slider", "Dialog", "Toast"].map((item, index) => <button className={`tone-${index} ${active === index ? "is-active" : ""}`} key={item} onClick={() => setActive(index)} type="button"><span>0{index + 1}</span><strong>{item}</strong></button>)}</div><div className="demo-dots">{[0, 1, 2].map((item) => <button aria-label={`跳到第 ${item + 1} 项`} className={active === item ? "is-active" : ""} key={item} onClick={() => setActive(item)} type="button" />)}</div></div>;
    case "pan-and-zoom":
      return <div className="demo-panzoom"><div><span style={{ transform: `scale(${zoom}) translate(${active * 4}px, ${active * -2}px)` }}>UI</span></div><div role="group" aria-label="画布控制"><button aria-label="向左平移" onClick={() => setActive((value) => value - 1)} type="button">←</button><button aria-label="缩小" onClick={() => setZoom((value) => Math.max(0.7, value - 0.15))} type="button">−</button><output>{Math.round(zoom * 100)}%</output><button aria-label="放大" onClick={() => setZoom((value) => Math.min(1.6, value + 0.15))} type="button">＋</button><button aria-label="向右平移" onClick={() => setActive((value) => value + 1)} type="button">→</button></div></div>;
    case "before-after-slider":
      return <div className="demo-before-after"><div className="demo-after"><span>AFTER</span></div><div className="demo-before" style={{ width: `${compare}%` }}><span>BEFORE</span></div><label style={{ left: `${compare}%` }}><span className="sr-only">调整前后对比</span><input max="92" min="8" onChange={(event) => setCompare(Number(event.target.value))} type="range" value={compare} /></label><output>{compare}%</output></div>;
    default:
      return null;
  }
}

const navigationSlugs = new Set<DemoSlug>(demoSlugs.slice(0, 9));
const actionSlugs = new Set<DemoSlug>(demoSlugs.slice(9, 17));
const inputSlugs = new Set<DemoSlug>(demoSlugs.slice(17, 26));
const selectionSlugs = new Set<DemoSlug>(demoSlugs.slice(26, 36));
const feedbackSlugs = new Set<DemoSlug>(demoSlugs.slice(36, 45));
const overlaySlugs = new Set<DemoSlug>(demoSlugs.slice(45, 54));
const contentSlugs = new Set<DemoSlug>(demoSlugs.slice(54, 61));
const dataSlugs = new Set<DemoSlug>(demoSlugs.slice(61, 67));
const motionSlugs = new Set<DemoSlug>(demoSlugs.slice(67, 75));

function DemoBySlug({ slug, density }: DemoStageProps) {
  const typedSlug = slug as DemoSlug;
  if (navigationSlugs.has(typedSlug)) return <NavigationDemo density={density} slug={typedSlug} />;
  if (actionSlugs.has(typedSlug)) return <ActionDemo density={density} slug={typedSlug} />;
  if (inputSlugs.has(typedSlug)) return <InputDemo density={density} slug={typedSlug} />;
  if (selectionSlugs.has(typedSlug)) return <SelectionDemo density={density} slug={typedSlug} />;
  if (feedbackSlugs.has(typedSlug)) return <FeedbackDemo density={density} slug={typedSlug} />;
  if (overlaySlugs.has(typedSlug)) return <OverlayDemo density={density} slug={typedSlug} />;
  if (contentSlugs.has(typedSlug)) return <ContentDemo density={density} slug={typedSlug} />;
  if (dataSlugs.has(typedSlug)) return <DataDemo density={density} slug={typedSlug} />;
  if (motionSlugs.has(typedSlug)) return <MotionDemo density={density} slug={typedSlug} />;
  return <p className="demo-unavailable">暂无演示</p>;
}

const entry = (slug: DemoSlug): ComponentType<DemoProps> => function RegistryEntry(props) {
  return <DemoBySlug {...props} slug={slug} />;
};

export const demoRegistry = {
  "navigation-bar": entry("navigation-bar"),
  "sidebar-navigation": entry("sidebar-navigation"),
  "navigation-drawer": entry("navigation-drawer"),
  "bottom-navigation": entry("bottom-navigation"),
  tabs: entry("tabs"),
  breadcrumb: entry("breadcrumb"),
  pagination: entry("pagination"),
  "progress-stepper": entry("progress-stepper"),
  "anchor-navigation": entry("anchor-navigation"),
  button: entry("button"),
  "icon-button": entry("icon-button"),
  "button-group": entry("button-group"),
  "split-button": entry("split-button"),
  toolbar: entry("toolbar"),
  "dropdown-menu": entry("dropdown-menu"),
  "context-menu": entry("context-menu"),
  "overflow-menu": entry("overflow-menu"),
  "text-field": entry("text-field"),
  textarea: entry("textarea"),
  "password-field": entry("password-field"),
  "search-field": entry("search-field"),
  spinbutton: entry("spinbutton"),
  "masked-input": entry("masked-input"),
  "otp-input": entry("otp-input"),
  "tags-input": entry("tags-input"),
  "file-upload": entry("file-upload"),
  checkbox: entry("checkbox"),
  "radio-group": entry("radio-group"),
  switch: entry("switch"),
  select: entry("select"),
  combobox: entry("combobox"),
  "segmented-control": entry("segmented-control"),
  slider: entry("slider"),
  "range-slider": entry("range-slider"),
  "date-picker": entry("date-picker"),
  "color-picker": entry("color-picker"),
  alert: entry("alert"),
  toast: entry("toast"),
  snackbar: entry("snackbar"),
  "inline-validation": entry("inline-validation"),
  "progress-bar": entry("progress-bar"),
  spinner: entry("spinner"),
  "skeleton-screen": entry("skeleton-screen"),
  badge: entry("badge"),
  "empty-state": entry("empty-state"),
  dialog: entry("dialog"),
  "alert-dialog": entry("alert-dialog"),
  popover: entry("popover"),
  tooltip: entry("tooltip"),
  "hover-card": entry("hover-card"),
  "side-sheet": entry("side-sheet"),
  accordion: entry("accordion"),
  disclosure: entry("disclosure"),
  lightbox: entry("lightbox"),
  card: entry("card"),
  "list-item": entry("list-item"),
  avatar: entry("avatar"),
  chip: entry("chip"),
  carousel: entry("carousel"),
  "image-gallery": entry("image-gallery"),
  "truncated-text": entry("truncated-text"),
  "data-table": entry("data-table"),
  "data-grid": entry("data-grid"),
  "tree-view": entry("tree-view"),
  timeline: entry("timeline"),
  "calendar-view": entry("calendar-view"),
  chart: entry("chart"),
  "drag-and-drop": entry("drag-and-drop"),
  "infinite-scroll": entry("infinite-scroll"),
  "lazy-loading": entry("lazy-loading"),
  marquee: entry("marquee"),
  "parallax-scrolling": entry("parallax-scrolling"),
  "scroll-snap": entry("scroll-snap"),
  "pan-and-zoom": entry("pan-and-zoom"),
  "before-after-slider": entry("before-after-slider"),
} satisfies Record<DemoSlug, ComponentType<DemoProps>>;

export function DemoStage({ slug, density }: DemoStageProps) {
  const Demo = demoRegistry[slug as DemoSlug];
  return (
    <section
      aria-label={`${slug} 交互式演示`}
      className={`demo-stage demo-stage--${density}`}
      data-demo-slug={slug}
    >
      <div className="demo-canvas">
        {Demo ? <Demo density={density} /> : <p className="demo-unavailable">暂无演示</p>}
      </div>
    </section>
  );
}
