export const categories = [
  { id: "navigation", zh: "导航与定位", en: "Navigation & Orientation" },
  { id: "actions", zh: "操作与菜单", en: "Actions & Menus" },
  { id: "inputs", zh: "文本与文件输入", en: "Text & File Inputs" },
  { id: "selection", zh: "选择与取值", en: "Selection & Values" },
  { id: "feedback", zh: "反馈与状态", en: "Feedback & Status" },
  { id: "overlays", zh: "浮层与展开", en: "Overlays & Disclosure" },
  { id: "content", zh: "内容与媒体", en: "Content & Media" },
  { id: "data", zh: "数据展示", en: "Data Display" },
  { id: "motion", zh: "动效与交互模式", en: "Motion & Interaction" },
] as const;

export const platforms = [
  { id: "web", zh: "网页", en: "Web" },
  { id: "mobile", zh: "移动端", en: "Mobile" },
  { id: "desktop", zh: "桌面端", en: "Desktop" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];
export type PlatformId = (typeof platforms)[number]["id"];

export interface BilingualText {
  readonly zh: string;
  readonly en: string;
}

export interface CodeFile {
  readonly name: string;
  readonly language: "html" | "css" | "js" | "jsx";
  readonly code: string;
}

export interface CodeBundle {
  readonly vanilla: readonly CodeFile[];
  readonly react: readonly CodeFile[];
}

export interface CatalogItem {
  readonly slug: string;
  readonly order: number;
  readonly category: CategoryId;
  readonly platforms: readonly PlatformId[];
  readonly name: BilingualText;
  readonly summary: BilingualText;
  readonly aliases: readonly string[];
  readonly keywords: readonly string[];
  readonly anatomy: readonly string[];
  readonly useWhen: readonly string[];
  readonly avoidWhen: readonly string[];
  readonly accessibility: readonly string[];
  readonly related: readonly string[];
  readonly aiPrompt: string;
  readonly code: CodeBundle;
}

type SampleKind =
  | "nav"
  | "tabs"
  | "steps"
  | "button"
  | "menu"
  | "field"
  | "tags"
  | "upload"
  | "choice"
  | "slider"
  | "picker"
  | "feedback"
  | "progress"
  | "overlay"
  | "disclosure"
  | "content"
  | "data"
  | "motion"
  | "viewport";

interface CatalogSeed {
  readonly slug: string;
  readonly category: CategoryId;
  readonly platforms: readonly PlatformId[];
  readonly name: BilingualText;
  readonly summary: BilingualText;
  readonly aliases: readonly string[];
  readonly keywords: readonly string[];
  readonly anatomy: readonly string[];
  readonly useWhen: readonly string[];
  readonly avoidWhen: readonly string[];
  readonly accessibility: readonly string[];
  readonly related: readonly string[];
  readonly sample: SampleKind;
}

const ALL = ["web", "mobile", "desktop"] as const;
const WEB_DESKTOP = ["web", "desktop"] as const;
const WEB_MOBILE = ["web", "mobile"] as const;

const bilingual = (zh: string, en: string): BilingualText => ({ zh, en });

const seed = (
  slug: string,
  category: CategoryId,
  itemPlatforms: readonly PlatformId[],
  zh: string,
  en: string,
  zhSummary: string,
  enSummary: string,
  aliases: readonly string[],
  keywords: readonly string[],
  anatomy: readonly string[],
  useWhen: string,
  avoidWhen: string,
  accessibility: string,
  related: readonly string[],
  sample: SampleKind,
): CatalogSeed => ({
  slug,
  category,
  platforms: itemPlatforms,
  name: bilingual(zh, en),
  summary: bilingual(zhSummary, enSummary),
  aliases,
  keywords,
  anatomy,
  useWhen: [useWhen],
  avoidWhen: [avoidWhen],
  accessibility: [accessibility],
  related,
  sample,
});

const baseCss = `.demo {
  max-width: 32rem;
  padding: 1rem;
  color: #e8f1ff;
  background: #0d1726;
  border: 1px solid #29415f;
  border-radius: 12px;
  font: 14px/1.5 system-ui, sans-serif;
}
.demo :is(button, input, select, textarea, a) { font: inherit; }
.demo :focus-visible { outline: 3px solid #60a5fa; outline-offset: 3px; }
.demo button, .demo input, .demo select, .demo textarea {
  min-height: 44px;
  border: 1px solid #496582;
  border-radius: 8px;
}
.demo button { padding: .6rem .9rem; color: #fff; background: #1769e0; cursor: pointer; }
.demo a { color: #8fc4ff; }
.row { display: flex; flex-wrap: wrap; gap: .65rem; align-items: center; }
.stack { display: grid; gap: .7rem; }
.muted { color: #9eb0c5; }`;

const codeFile = (
  name: string,
  language: CodeFile["language"],
  code: string,
): CodeFile => ({ name, language, code: code.trim() });

function makeCode(item: CatalogSeed): CodeBundle {
  const label = `${item.name.zh} / ${item.name.en}`;
  let html = `<section class="demo" aria-label="${label}"><p>${item.summary.zh}</p></section>`;
  let js = `// 这个示例不需要 JavaScript。`;
  let jsx = `export default function Component() {
  return <section className="demo" aria-label="${label}"><p>${item.summary.zh}</p></section>;
}`;
  let extraCss = "";

  switch (item.sample) {
    case "nav": {
      html = `<nav class="demo row" aria-label="${item.name.zh}">
  <strong>Acme</strong>
  <a href="#overview" aria-current="page">概览</a>
  <a href="#examples">示例</a>
</nav>`;
      jsx = `export default function Component() {
  return <nav className="demo row" aria-label="${item.name.zh}">
    <strong>Acme</strong><a href="#overview" aria-current="page">概览</a><a href="#examples">示例</a>
  </nav>;
}`;
      break;
    }
    case "tabs": {
      html = `<section class="demo stack">
  <div class="row" role="tablist" aria-label="账户设置">
    <button role="tab" aria-selected="true" aria-controls="profile">资料</button>
    <button role="tab" aria-selected="false" aria-controls="security">安全</button>
  </div>
  <div id="profile" role="tabpanel">编辑你的公开资料。</div>
  <div id="security" role="tabpanel" hidden>管理登录与密码。</div>
</section>`;
      js = `const tabs = [...document.querySelectorAll('[role="tab"]')];
tabs.forEach((tab, index) => tab.addEventListener('click', () => {
  tabs.forEach((item, itemIndex) => {
    const selected = itemIndex === index;
    item.setAttribute('aria-selected', String(selected));
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
}));`;
      jsx = `import { useState } from "react";
export default function Component() {
  const [tab, setTab] = useState("profile");
  return <section className="demo stack">
    <div className="row" role="tablist" aria-label="账户设置">
      {[["profile", "资料"], ["security", "安全"]].map(([id, text]) =>
        <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{text}</button>)}
    </div><div role="tabpanel">{tab === "profile" ? "编辑你的公开资料。" : "管理登录与密码。"}</div>
  </section>;
}`;
      break;
    }
    case "steps": {
      html = `<nav class="demo" aria-label="${item.name.zh}">
  <ol class="row"><li aria-current="step"><strong>1. 资料</strong></li><li>2. 确认</li><li>3. 完成</li></ol>
</nav>`;
      jsx = `export default function Component() {
  return <nav className="demo" aria-label="${item.name.zh}"><ol className="row">
    <li aria-current="step"><strong>1. 资料</strong></li><li>2. 确认</li><li>3. 完成</li>
  </ol></nav>;
}`;
      break;
    }
    case "button": {
      const iconOnly = item.slug === "icon-button";
      html = iconOnly
        ? `<div class="demo"><button type="button" aria-label="收藏">☆</button></div>`
        : `<div class="demo row"><button type="button">保存更改</button><button type="button">更多选项</button></div>`;
      js = `document.querySelector('.demo button').addEventListener('click', () => console.log('${item.name.en} activated'));`;
      jsx = `export default function Component() {
  return <div className="demo row"><button type="button" onClick={() => alert("操作已触发")}>${iconOnly ? "☆" : "保存更改"}</button></div>;
}`;
      break;
    }
    case "menu": {
      html = `<div class="demo stack">
  <button type="button" aria-haspopup="menu" aria-expanded="false">打开${item.name.zh}</button>
  <div role="menu" hidden><button role="menuitem">重命名</button><button role="menuitem">复制</button></div>
</div>`;
      js = `const trigger = document.querySelector('[aria-haspopup="menu"]');
const menu = document.querySelector('[role="menu"]');
trigger.addEventListener('click', () => {
  const open = trigger.getAttribute('aria-expanded') !== 'true';
  trigger.setAttribute('aria-expanded', String(open));
  menu.hidden = !open;
  if (open) menu.querySelector('[role="menuitem"]').focus();
});`;
      jsx = `import { useState } from "react";
export default function Component() {
  const [open, setOpen] = useState(false);
  return <div className="demo stack"><button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>打开${item.name.zh}</button>
    {open && <div role="menu"><button role="menuitem">重命名</button><button role="menuitem">复制</button></div>}</div>;
}`;
      break;
    }
    case "field": {
      const control = item.slug === "textarea"
        ? `<textarea id="field" rows="3" placeholder="请输入内容"></textarea>`
        : `<input id="field" type="${item.slug === "password-field" ? "password" : item.slug === "search-field" ? "search" : item.slug === "spinbutton" ? "number" : "text"}" placeholder="请输入内容">`;
      html = `<label class="demo stack" for="field"><span>${item.name.zh}</span>${control}<small class="muted">输入内容会保留在当前示例中。</small></label>`;
      js = `document.getElementById('field').addEventListener('input', (event) => console.log(event.target.value));`;
      jsx = `import { useState } from "react";
export default function Component() {
  const [value, setValue] = useState("");
  return <label className="demo stack"><span>${item.name.zh}</span><input value={value} onChange={e => setValue(e.target.value)} placeholder="请输入内容" /><small className="muted">已输入 {value.length} 个字符</small></label>;
}`;
      break;
    }
    case "tags": {
      html = `<div class="demo stack"><label for="tag">添加标签</label><div class="row"><span>设计 <button aria-label="移除设计标签">×</button></span></div><input id="tag" placeholder="输入后按 Enter"></div>`;
      js = `document.getElementById('tag').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); console.log(event.currentTarget.value); } });`;
      jsx = `import { useState } from "react";
export default function Component() { const [tag, setTag] = useState(""); return <div className="demo stack"><label>添加标签<input value={tag} onChange={e => setTag(e.target.value)} /></label><span>设计 <button aria-label="移除设计标签">×</button></span></div>; }`;
      break;
    }
    case "upload": {
      html = `<label class="demo stack" for="file"><strong>拖放文件，或点击选择</strong><input id="file" type="file"><small class="muted">示例不会上传文件。</small></label>`;
      js = `document.getElementById('file').addEventListener('change', event => console.log(event.target.files[0]?.name));`;
      jsx = `export default function Component() { return <label className="demo stack"><strong>拖放文件，或点击选择</strong><input type="file" onChange={e => console.log(e.target.files?.[0]?.name)} /><small className="muted">示例不会上传文件。</small></label>; }`;
      break;
    }
    case "choice": {
      if (item.slug === "select" || item.slug === "combobox") {
        html = `<label class="demo stack" for="choice"><span>${item.name.zh}</span><select id="choice"><option>设计</option><option>开发</option></select></label>`;
        jsx = `export default function Component() { return <label className="demo stack"><span>${item.name.zh}</span><select defaultValue="设计"><option>设计</option><option>开发</option></select></label>; }`;
      } else {
        const type = item.slug === "radio-group" || item.slug === "segmented-control" ? "radio" : "checkbox";
        html = `<fieldset class="demo row"><legend>${item.name.zh}</legend><label><input type="${type}" name="choice"> 开启通知</label><label><input type="${type}" name="choice"> 每周摘要</label></fieldset>`;
        jsx = `export default function Component() { return <fieldset className="demo row"><legend>${item.name.zh}</legend><label><input type="${type}" name="choice" /> 开启通知</label><label><input type="${type}" name="choice" /> 每周摘要</label></fieldset>; }`;
      }
      js = `document.querySelector('.demo').addEventListener('change', event => console.log(event.target.value));`;
      break;
    }
    case "slider": {
      const two = item.slug === "range-slider";
      html = `<div class="demo stack"><label for="range">${item.name.zh}：<output>40</output></label><input id="range" type="range" min="0" max="100" value="40">${two ? '<input aria-label="最大值" type="range" min="0" max="100" value="80">' : ""}</div>`;
      js = `const range = document.getElementById('range'); const output = document.querySelector('output'); range.addEventListener('input', () => output.value = range.value);`;
      jsx = `import { useState } from "react";
export default function Component() { const [value, setValue] = useState(40); return <div className="demo stack"><label>${item.name.zh}：<output>{value}</output><input type="range" min="0" max="100" value={value} onChange={e => setValue(Number(e.target.value))} /></label>${two ? '<input aria-label="最大值" type="range" defaultValue="80" />' : ""}</div>; }`;
      break;
    }
    case "picker": {
      const type = item.slug === "date-picker" ? "date" : "color";
      html = `<label class="demo stack" for="picker"><span>${item.name.zh}</span><input id="picker" type="${type}"></label>`;
      js = `document.getElementById('picker').addEventListener('input', event => console.log(event.target.value));`;
      jsx = `import { useState } from "react";
export default function Component() { const [value, setValue] = useState(""); return <label className="demo stack"><span>${item.name.zh}</span><input type="${type}" value={value} onChange={e => setValue(e.target.value)} /></label>; }`;
      break;
    }
    case "feedback": {
      const role = item.slug === "alert" || item.slug === "inline-validation" ? "alert" : "status";
      html = `<div class="demo" role="${role}"><strong>${item.name.zh}</strong><p>${item.summary.zh}</p><button type="button">知道了</button></div>`;
      js = `document.querySelector('.demo button').addEventListener('click', event => event.currentTarget.parentElement.hidden = true);`;
      jsx = `import { useState } from "react";
export default function Component() { const [visible, setVisible] = useState(true); return visible ? <div className="demo" role="${role}"><strong>${item.name.zh}</strong><p>${item.summary.zh}</p><button onClick={() => setVisible(false)}>知道了</button></div> : null; }`;
      break;
    }
    case "progress": {
      html = item.slug === "progress-bar"
        ? `<div class="demo stack"><label for="progress">上传进度</label><progress id="progress" max="100" value="64">64%</progress></div>`
        : `<div class="demo" role="status" aria-live="polite"><span class="loader" aria-hidden="true"></span><span>正在加载…</span></div>`;
      extraCss = `.loader { display: inline-block; width: 1.25rem; height: 1.25rem; margin-right: .5rem; border: 3px solid #496582; border-top-color: #60a5fa; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(1turn); } }
@media (prefers-reduced-motion: reduce) { .loader { animation: none; } }`;
      jsx = `export default function Component() { return <div className="demo" role="status"><progress max="100" value="64">64%</progress><span> 正在加载…</span></div>; }`;
      break;
    }
    case "overlay": {
      html = `<div class="demo"><button id="open" type="button">打开${item.name.zh}</button><dialog aria-labelledby="title"><h2 id="title">${item.name.zh}</h2><p>${item.summary.zh}</p><button id="close">关闭</button></dialog></div>`;
      js = `const dialog = document.querySelector('dialog'); document.getElementById('open').addEventListener('click', () => dialog.showModal()); document.getElementById('close').addEventListener('click', () => dialog.close());`;
      jsx = `import { useRef } from "react";
export default function Component() { const ref = useRef(null); return <div className="demo"><button onClick={() => ref.current?.showModal()}>打开${item.name.zh}</button><dialog ref={ref} aria-labelledby="title"><h2 id="title">${item.name.zh}</h2><p>${item.summary.zh}</p><button onClick={() => ref.current?.close()}>关闭</button></dialog></div>; }`;
      break;
    }
    case "disclosure": {
      html = `<details class="demo"><summary>${item.name.zh}：配送信息</summary><p>工作日 16:00 前下单，当天发货。</p></details>`;
      jsx = `export default function Component() { return <details className="demo"><summary>${item.name.zh}：配送信息</summary><p>工作日 16:00 前下单，当天发货。</p></details>; }`;
      break;
    }
    case "content": {
      html = `<article class="demo stack"><strong>${item.name.zh}</strong><p>${item.summary.zh}</p><div class="row"><button type="button">上一个</button><button type="button">下一个</button></div></article>`;
      js = `document.querySelectorAll('.demo button').forEach(button => button.addEventListener('click', () => console.log(button.textContent)));`;
      jsx = `export default function Component() { return <article className="demo stack"><strong>${item.name.zh}</strong><p>${item.summary.zh}</p><button type="button">查看内容</button></article>; }`;
      break;
    }
    case "data": {
      html = `<div class="demo" tabindex="0" aria-label="${item.name.zh}"><table><caption>项目状态</caption><thead><tr><th scope="col">项目</th><th scope="col">状态</th></tr></thead><tbody><tr><th scope="row">词典</th><td>进行中</td></tr></tbody></table></div>`;
      extraCss = `.demo { overflow-x: auto; } table { width: 100%; border-collapse: collapse; } th, td { padding: .6rem; border-bottom: 1px solid #29415f; text-align: left; }`;
      jsx = `export default function Component() { return <div className="demo"><table><caption>${item.name.zh}示例</caption><thead><tr><th scope="col">项目</th><th scope="col">状态</th></tr></thead><tbody><tr><th scope="row">词典</th><td>进行中</td></tr></tbody></table></div>; }`;
      break;
    }
    case "motion": {
      html = `<section class="demo stack" aria-label="${item.name.zh}"><button type="button" aria-pressed="false">暂停动效</button><div class="motion-sample">${item.name.zh}</div></section>`;
      js = `const button = document.querySelector('.demo button'); button.addEventListener('click', () => { const paused = button.getAttribute('aria-pressed') !== 'true'; button.setAttribute('aria-pressed', String(paused)); document.querySelector('.motion-sample').classList.toggle('paused', paused); });`;
      extraCss = `.motion-sample { padding: .75rem; background: #1769e0; border-radius: 8px; animation: drift 2s ease-in-out infinite alternate; } .paused { animation-play-state: paused; } @keyframes drift { to { transform: translateX(2rem); } } @media (prefers-reduced-motion: reduce) { .motion-sample { animation: none; } }`;
      jsx = `import { useState } from "react";
export default function Component() { const [paused, setPaused] = useState(false); return <section className="demo stack" aria-label="${item.name.zh}"><button aria-pressed={paused} onClick={() => setPaused(!paused)}>暂停动效</button><div className={paused ? "motion-sample paused" : "motion-sample"}>${item.name.zh}</div></section>; }`;
      break;
    }
    case "viewport": {
      html = `<section class="demo stack" aria-label="${item.name.zh}"><div class="viewport" tabindex="0"><article>项目 1</article><article>项目 2</article><article>项目 3</article></div><button type="button">加载更多</button></section>`;
      js = `document.querySelector('.demo button').addEventListener('click', () => { const article = document.createElement('article'); article.textContent = '新项目'; document.querySelector('.viewport').append(article); });`;
      extraCss = `.viewport { display: flex; gap: .75rem; overflow: auto; scroll-snap-type: x mandatory; } .viewport article { min-width: 12rem; padding: 2rem 1rem; background: #172a42; border-radius: 8px; scroll-snap-align: start; }`;
      jsx = `import { useState } from "react";
export default function Component() { const [count, setCount] = useState(3); return <section className="demo stack"><div className="viewport">{Array.from({ length: count }, (_, i) => <article key={i}>项目 {i + 1}</article>)}</div><button onClick={() => setCount(count + 1)}>加载更多</button></section>; }`;
      break;
    }
  }

  // Shared family samples stay deliberately small; these overrides preserve the
  // semantics of components that are commonly confused with a nearby pattern.
  switch (item.slug) {
    case "breadcrumb":
      html = `<nav class="demo" aria-label="面包屑"><ol class="row"><li><a href="/">首页</a></li><li><a href="/components">组件</a></li><li aria-current="page">面包屑</li></ol></nav>`;
      js = `// 面包屑使用普通链接，不需要 JavaScript。`;
      jsx = `export default function Component() { return <nav className="demo" aria-label="面包屑"><ol className="row"><li><a href="/">首页</a></li><li><a href="/components">组件</a></li><li aria-current="page">面包屑</li></ol></nav>; }`;
      break;
    case "pagination":
      html = `<nav class="demo" aria-label="分页"><a href="?page=1">上一页</a> <a href="?page=1">1</a> <a href="?page=2" aria-current="page">2</a> <a href="?page=3">3</a> <a href="?page=3">下一页</a></nav>`;
      js = `// 分页应使用可复制、可分享的真实链接。`;
      jsx = `export default function Component() { return <nav className="demo" aria-label="分页"><a href="?page=1">上一页</a> <a href="?page=2" aria-current="page">2</a> <a href="?page=3">下一页</a></nav>; }`;
      break;
    case "split-button":
      html = `<div class="demo row"><button type="button">保存</button><button type="button" aria-label="更多保存选项" aria-haspopup="menu" aria-expanded="false">▾</button><div role="menu" hidden><button role="menuitem">另存为副本</button></div></div>`;
      js = `const trigger = document.querySelector('[aria-haspopup="menu"]'); const menu = document.querySelector('[role="menu"]'); trigger.addEventListener('click', () => { const open = trigger.getAttribute('aria-expanded') !== 'true'; trigger.setAttribute('aria-expanded', String(open)); menu.hidden = !open; });`;
      jsx = `import { useState } from "react";
export default function Component() { const [open, setOpen] = useState(false); return <div className="demo row"><button>保存</button><button aria-label="更多保存选项" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>▾</button>{open && <div role="menu"><button role="menuitem">另存为副本</button></div>}</div>; }`;
      break;
    case "toolbar":
      html = `<div class="demo row" role="toolbar" aria-label="文字格式"><button type="button" aria-label="加粗"><strong>B</strong></button><button type="button" aria-label="斜体"><em>I</em></button><button type="button" aria-label="添加链接">🔗</button></div>`;
      js = `document.querySelectorAll('[role="toolbar"] button').forEach(button => button.addEventListener('click', () => console.log(button.getAttribute('aria-label'))));`;
      jsx = `export default function Component() { return <div className="demo row" role="toolbar" aria-label="文字格式"><button aria-label="加粗"><strong>B</strong></button><button aria-label="斜体"><em>I</em></button><button aria-label="添加链接">🔗</button></div>; }`;
      break;
    case "context-menu":
      html = `<div class="demo" id="target" tabindex="0">右键点击或按 Shift+F10<div role="menu" hidden><button role="menuitem">复制</button><button role="menuitem">删除</button></div></div>`;
      js = `const target = document.getElementById('target'); const menu = target.querySelector('[role="menu"]'); const open = event => { event.preventDefault(); menu.hidden = false; menu.querySelector('button').focus(); }; target.addEventListener('contextmenu', open); target.addEventListener('keydown', event => { if (event.shiftKey && event.key === 'F10') open(event); if (event.key === 'Escape') { menu.hidden = true; target.focus(); } });`;
      jsx = `import { useState } from "react";
export default function Component() { const [open, setOpen] = useState(false); return <div className="demo" tabIndex={0} onContextMenu={e => { e.preventDefault(); setOpen(true); }}>右键点击或按 Shift+F10{open && <div role="menu"><button role="menuitem" onClick={() => setOpen(false)}>复制</button></div>}</div>; }`;
      break;
    case "textarea":
      jsx = `import { useState } from "react";
export default function Component() { const [value, setValue] = useState(""); return <label className="demo stack"><span>详细说明</span><textarea rows={4} value={value} onChange={e => setValue(e.target.value)} /><small className="muted">{value.length}/500</small></label>; }`;
      break;
    case "password-field":
      jsx = `import { useState } from "react";
export default function Component() { const [shown, setShown] = useState(false); return <div className="demo stack"><label htmlFor="password">密码</label><input id="password" type={shown ? "text" : "password"} autoComplete="current-password" /><button type="button" aria-pressed={shown} onClick={() => setShown(!shown)}>{shown ? "隐藏密码" : "显示密码"}</button></div>; }`;
      html = `<div class="demo stack"><label for="password">密码</label><input id="password" type="password" autocomplete="current-password"><button type="button" aria-pressed="false">显示密码</button></div>`;
      js = `const input = document.getElementById('password'); const button = document.querySelector('.demo button'); button.addEventListener('click', () => { const shown = input.type === 'text'; input.type = shown ? 'password' : 'text'; button.textContent = shown ? '显示密码' : '隐藏密码'; button.setAttribute('aria-pressed', String(!shown)); });`;
      break;
    case "search-field":
      html = `<search class="demo"><form role="search"><label for="query">搜索组件</label><div class="row"><input id="query" type="search" name="q"><button>搜索</button></div></form></search>`;
      js = `document.querySelector('form').addEventListener('submit', event => { event.preventDefault(); console.log(new FormData(event.currentTarget).get('q')); });`;
      jsx = `export default function Component() { return <search className="demo"><form role="search" onSubmit={e => e.preventDefault()}><label htmlFor="query">搜索组件</label><div className="row"><input id="query" type="search" name="q" /><button>搜索</button></div></form></search>; }`;
      break;
    case "spinbutton":
      html = `<label class="demo stack" for="quantity"><span>数量</span><input id="quantity" type="number" min="1" max="10" step="1" value="1"></label>`;
      jsx = `export default function Component() { return <label className="demo stack"><span>数量</span><input type="number" min="1" max="10" step="1" defaultValue="1" /></label>; }`;
      break;
    case "masked-input":
      html = `<label class="demo stack" for="phone"><span>手机号（按 3-4-4 位输入）</span><input id="phone" inputmode="numeric" autocomplete="tel" placeholder="138 0000 0000"></label>`;
      js = `const input = document.getElementById('phone'); input.addEventListener('input', () => { const digits = input.value.replace(/\\D/g, '').slice(0, 11); input.value = [digits.slice(0,3), digits.slice(3,7), digits.slice(7)].filter(Boolean).join(' '); });`;
      jsx = `import { useState } from "react";
export default function Component() { const [value, setValue] = useState(""); const format = raw => raw.replace(/\\D/g, "").slice(0, 11).replace(/(\\d{3})(\\d{0,4})(\\d{0,4})/, (_, a, b, c) => [a,b,c].filter(Boolean).join(" ")); return <label className="demo stack"><span>手机号</span><input inputMode="numeric" autoComplete="tel" value={value} onChange={e => setValue(format(e.target.value))} /></label>; }`;
      break;
    case "otp-input":
      html = `<label class="demo stack" for="code"><span>6 位验证码</span><input id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}"></label>`;
      js = `document.getElementById('code').addEventListener('input', event => event.currentTarget.value = event.currentTarget.value.replace(/\\D/g, '').slice(0, 6));`;
      jsx = `export default function Component() { return <label className="demo stack"><span>6 位验证码</span><input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" /></label>; }`;
      break;
    case "switch":
      html = `<label class="demo row"><input type="checkbox" role="switch"> 开启通知</label>`;
      js = `document.querySelector('[role="switch"]').addEventListener('change', event => console.log(event.currentTarget.checked));`;
      jsx = `import { useState } from "react";
export default function Component() { const [on, setOn] = useState(false); return <label className="demo row"><input type="checkbox" role="switch" checked={on} onChange={e => setOn(e.target.checked)} /> 开启通知</label>; }`;
      break;
    case "combobox":
      html = `<label class="demo stack" for="city"><span>城市</span><input id="city" role="combobox" aria-expanded="false" aria-controls="cities" list="cities"><datalist id="cities"><option value="北京"><option value="上海"><option value="深圳"></datalist></label>`;
      js = `document.getElementById('city').addEventListener('input', event => event.currentTarget.setAttribute('aria-expanded', String(Boolean(event.currentTarget.value))));`;
      jsx = `export default function Component() { return <label className="demo stack"><span>城市</span><input role="combobox" aria-expanded="false" list="cities" /><datalist id="cities"><option value="北京" /><option value="上海" /><option value="深圳" /></datalist></label>; }`;
      break;
    case "inline-validation":
      html = `<div class="demo stack"><label for="email">邮箱</label><input id="email" type="email" aria-invalid="true" aria-describedby="email-error" value="name@"><p id="email-error" role="alert">请输入完整邮箱地址，例如 name@example.com。</p></div>`;
      js = `const input = document.getElementById('email'); input.addEventListener('input', () => input.setAttribute('aria-invalid', String(!input.validity.valid)));`;
      jsx = `export default function Component() { return <div className="demo stack"><label htmlFor="email">邮箱</label><input id="email" type="email" aria-invalid="true" aria-describedby="email-error" defaultValue="name@" /><p id="email-error" role="alert">请输入完整邮箱地址。</p></div>; }`;
      break;
    case "badge":
      html = `<div class="demo row"><span>收件箱</span><span aria-label="3 条未读消息">3</span><span class="muted">进行中</span></div>`;
      js = `// 徽标是状态文本，不需要 JavaScript。`;
      jsx = `export default function Component() { return <div className="demo row"><span>收件箱</span><span aria-label="3 条未读消息">3</span><span className="muted">进行中</span></div>; }`;
      break;
    case "empty-state":
      html = `<section class="demo stack"><h2>还没有项目</h2><p class="muted">创建第一个项目后，它会显示在这里。</p><button type="button">新建项目</button></section>`;
      js = `document.querySelector('.demo button').addEventListener('click', () => console.log('create'));`;
      jsx = `export default function Component() { return <section className="demo stack"><h2>还没有项目</h2><p className="muted">创建第一个项目后，它会显示在这里。</p><button>新建项目</button></section>; }`;
      break;
    case "skeleton-screen":
      html = `<div class="demo stack" role="status"><span class="muted">正在加载内容…</span><div class="skeleton" aria-hidden="true"></div><div class="skeleton short" aria-hidden="true"></div></div>`;
      js = `// 加载完成后，用真实内容替换整个状态区域。`;
      extraCss = `.skeleton { height: 1rem; border-radius: 999px; background: #29415f; animation: pulse 1.2s ease-in-out infinite alternate; } .skeleton.short { width: 65%; } @keyframes pulse { to { opacity: .45; } } @media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }`;
      jsx = `export default function Component() { return <div className="demo stack" role="status"><span className="muted">正在加载内容…</span><div className="skeleton" aria-hidden="true" /><div className="skeleton short" aria-hidden="true" /></div>; }`;
      break;
    case "popover":
      html = `<div class="demo"><button type="button" popovertarget="filters">筛选</button><div id="filters" popover><label><input type="checkbox"> 仅显示可用项</label></div></div>`;
      js = `// popover 属性提供显示、外部关闭与 Escape 行为。`;
      jsx = `export default function Component() { return <div className="demo"><button type="button" popoverTarget="filters">筛选</button><div id="filters" popover="auto"><label><input type="checkbox" /> 仅显示可用项</label></div></div>; }`;
      break;
    case "tooltip":
      html = `<div class="demo"><button type="button" aria-describedby="tip">⌘</button><span id="tip" role="tooltip">打开命令面板</span></div>`;
      js = `// 工具提示由 hover 与 focus 样式控制。`;
      extraCss = `[role="tooltip"] { margin-left: .5rem; padding: .35rem .5rem; background: #000; border-radius: 6px; }`;
      jsx = `export default function Component() { return <div className="demo"><button aria-describedby="tip">⌘</button><span id="tip" role="tooltip">打开命令面板</span></div>; }`;
      break;
    case "hover-card":
      html = `<p class="demo">维护者：<a href="/people/lin" aria-describedby="profile">林晨</a><span id="profile" role="status"><strong>林晨</strong> · 产品设计师</span></p>`;
      js = `// 预览在链接聚焦或悬停时可见；链接本身仍可正常导航。`;
      extraCss = `#profile { display: inline-grid; margin-left: .75rem; padding: .6rem; background: #172a42; border-radius: 8px; }`;
      jsx = `export default function Component() { return <p className="demo">维护者：<a href="/people/lin" aria-describedby="profile">林晨</a><span id="profile" role="status"><strong>林晨</strong> · 产品设计师</span></p>; }`;
      break;
    case "accordion":
      html = `<section class="demo stack" aria-label="常见问题"><details><summary>可以键盘操作吗？</summary><p>可以，焦点位于标题时按 Enter 或空格。</p></details><details><summary>能同时展开吗？</summary><p>这个示例允许同时展开。</p></details></section>`;
      js = `// details/summary 自带键盘展开行为。`;
      jsx = `export default function Component() { return <section className="demo stack" aria-label="常见问题"><details><summary>可以键盘操作吗？</summary><p>可以，按 Enter 或空格。</p></details><details><summary>能同时展开吗？</summary><p>这个示例允许同时展开。</p></details></section>; }`;
      break;
    case "list-item":
      html = `<ul class="demo stack"><li><a href="/messages/1"><strong>设计评审</strong><br><span class="muted">今天 10:30</span></a></li><li><a href="/messages/2"><strong>版本发布</strong><br><span class="muted">昨天</span></a></li></ul>`;
      js = `// 列表项使用真实链接，不需要 JavaScript。`;
      jsx = `export default function Component() { return <ul className="demo stack"><li><a href="/messages/1"><strong>设计评审</strong><br /><span className="muted">今天 10:30</span></a></li><li><a href="/messages/2">版本发布</a></li></ul>; }`;
      break;
    case "avatar":
      html = `<div class="demo row"><span class="avatar" role="img" aria-label="林晨的头像">林</span><span>林晨</span></div>`;
      js = `// 首字母头像不需要 JavaScript。`;
      extraCss = `.avatar { display: grid; place-items: center; width: 3rem; height: 3rem; border-radius: 50%; color: #07111f; background: #8fc4ff; font-weight: 700; }`;
      jsx = `export default function Component() { return <div className="demo row"><span className="avatar" role="img" aria-label="林晨的头像">林</span><span>林晨</span></div>; }`;
      break;
    case "chip":
      html = `<div class="demo row" aria-label="已选筛选条件"><span>平台：Web <button type="button" aria-label="移除平台 Web">×</button></span><span>状态：可用 <button type="button" aria-label="移除状态 可用">×</button></span></div>`;
      js = `document.querySelectorAll('.demo button').forEach(button => button.addEventListener('click', () => button.parentElement.remove()));`;
      jsx = `import { useState } from "react";
export default function Component() { const [visible, setVisible] = useState(true); return <div className="demo row" aria-label="已选筛选条件">{visible && <span>平台：Web <button aria-label="移除平台 Web" onClick={() => setVisible(false)}>×</button></span>}</div>; }`;
      break;
    case "carousel":
      html = `<section class="demo stack" aria-roledescription="轮播" aria-label="产品亮点"><p id="slide" aria-live="polite">第 1 张：快速搜索</p><div class="row"><button id="prev">上一张</button><button id="next">下一张</button></div></section>`;
      js = `const slides = ['快速搜索', '交互预览', '双语术语']; let index = 0; const render = () => document.getElementById('slide').textContent = \`第 \${index + 1} 张：\${slides[index]}\`; document.getElementById('prev').addEventListener('click', () => { index = (index - 1 + slides.length) % slides.length; render(); }); document.getElementById('next').addEventListener('click', () => { index = (index + 1) % slides.length; render(); });`;
      jsx = `import { useState } from "react";
export default function Component() { const slides = ["快速搜索", "交互预览", "双语术语"]; const [index, setIndex] = useState(0); return <section className="demo stack" aria-roledescription="轮播" aria-label="产品亮点"><p aria-live="polite">第 {index + 1} 张：{slides[index]}</p><div className="row"><button onClick={() => setIndex((index + slides.length - 1) % slides.length)}>上一张</button><button onClick={() => setIndex((index + 1) % slides.length)}>下一张</button></div></section>; }`;
      break;
    case "image-gallery":
      html = `<ul class="demo gallery" aria-label="旅行照片"><li><button aria-label="打开海边照片"><span role="img" aria-label="蓝色海面">🌊</span></button></li><li><button aria-label="打开山谷照片"><span role="img" aria-label="绿色山谷">🏞️</span></button></li></ul>`;
      js = `document.querySelectorAll('.gallery button').forEach(button => button.addEventListener('click', () => console.log(button.getAttribute('aria-label'))));`;
      extraCss = `.gallery { display: grid; grid-template-columns: repeat(2, 1fr); list-style: none; } .gallery button { width: 100%; min-height: 7rem; font-size: 2rem; }`;
      jsx = `export default function Component() { return <ul className="demo gallery" aria-label="旅行照片"><li><button aria-label="打开海边照片"><span role="img" aria-label="蓝色海面">🌊</span></button></li><li><button aria-label="打开山谷照片"><span role="img" aria-label="绿色山谷">🏞️</span></button></li></ul>; }`;
      break;
    case "data-grid":
      html = `<div class="demo" role="grid" aria-label="预算"><div role="row"><span role="columnheader">项目</span> <span role="columnheader">金额</span></div><div role="row"><span role="gridcell" tabindex="0">设计</span> <span role="gridcell" tabindex="-1">¥800</span></div></div>`;
      js = `const cells = [...document.querySelectorAll('[role="gridcell"]')]; cells.forEach((cell, index) => cell.addEventListener('keydown', event => { if (event.key === 'ArrowRight') { event.preventDefault(); cells[Math.min(index + 1, cells.length - 1)].focus(); } }));`;
      jsx = `export default function Component() { return <div className="demo" role="grid" aria-label="预算"><div role="row"><span role="columnheader">项目</span> <span role="columnheader">金额</span></div><div role="row"><span role="gridcell" tabIndex={0}>设计</span> <span role="gridcell" tabIndex={-1}>¥800</span></div></div>; }`;
      break;
    case "tree-view":
      html = `<ul class="demo" role="tree" aria-label="文件"><li role="treeitem" aria-expanded="true">组件<ul role="group"><li role="treeitem" tabindex="0">Button.tsx</li><li role="treeitem" tabindex="-1">Slider.tsx</li></ul></li></ul>`;
      js = `document.querySelector('[aria-expanded]').addEventListener('click', event => { const open = event.currentTarget.getAttribute('aria-expanded') === 'true'; event.currentTarget.setAttribute('aria-expanded', String(!open)); event.currentTarget.querySelector('[role="group"]').hidden = open; });`;
      jsx = `import { useState } from "react";
export default function Component() { const [open, setOpen] = useState(true); return <ul className="demo" role="tree" aria-label="文件"><li role="treeitem" aria-expanded={open} onClick={() => setOpen(!open)}>组件{open && <ul role="group"><li role="treeitem">Button.tsx</li><li role="treeitem">Slider.tsx</li></ul>}</li></ul>; }`;
      break;
    case "timeline":
      html = `<ol class="demo stack"><li><time datetime="2026-07-14T10:00">10:00</time> 创建任务</li><li><time datetime="2026-07-14T11:30">11:30</time> 完成设计</li><li><time datetime="2026-07-14T14:00">14:00</time> 发布</li></ol>`;
      js = `// 时间线使用有序列表与 time 元素。`;
      jsx = `export default function Component() { return <ol className="demo stack"><li><time dateTime="2026-07-14T10:00">10:00</time> 创建任务</li><li><time dateTime="2026-07-14T14:00">14:00</time> 发布</li></ol>; }`;
      break;
    case "calendar-view":
      html = `<table class="demo"><caption>2026 年 7 月</caption><thead><tr><th scope="col">一</th><th scope="col">二</th><th scope="col">三</th></tr></thead><tbody><tr><td><button aria-label="7 月 13 日">13</button></td><td><button aria-label="7 月 14 日，有 2 个事件">14</button></td><td><button aria-label="7 月 15 日">15</button></td></tr></tbody></table>`;
      js = `document.querySelectorAll('td button').forEach(button => button.addEventListener('click', () => console.log(button.getAttribute('aria-label'))));`;
      jsx = `export default function Component() { return <table className="demo"><caption>2026 年 7 月</caption><thead><tr><th scope="col">一</th><th scope="col">二</th><th scope="col">三</th></tr></thead><tbody><tr><td><button aria-label="7 月 13 日">13</button></td><td><button aria-label="7 月 14 日，有 2 个事件">14</button></td><td><button aria-label="7 月 15 日">15</button></td></tr></tbody></table>; }`;
      break;
    case "chart":
      html = `<figure class="demo"><svg viewBox="0 0 240 120" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">三个月访问量</title><desc id="chart-desc">五月 40，六月 75，七月 60。</desc><rect x="20" y="60" width="45" height="40"></rect><rect x="95" y="25" width="45" height="75"></rect><rect x="170" y="40" width="45" height="60"></rect></svg><figcaption>访问量（千次）</figcaption></figure>`;
      js = `// 图表的可访问标题和摘要直接包含在 SVG 中。`;
      extraCss = `svg { width: 100%; } rect { fill: #60a5fa; }`;
      jsx = `export default function Component() { return <figure className="demo"><svg viewBox="0 0 240 120" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">三个月访问量</title><desc id="chart-desc">五月 40，六月 75，七月 60。</desc><rect x="20" y="60" width="45" height="40" /><rect x="95" y="25" width="45" height="75" /><rect x="170" y="40" width="45" height="60" /></svg><figcaption>访问量（千次）</figcaption></figure>; }`;
      break;
    case "drag-and-drop":
      html = `<ol class="demo stack" id="sortable"><li draggable="true">搜索 <button aria-label="将搜索下移">下移</button></li><li draggable="true">筛选 <button aria-label="将筛选上移">上移</button></li></ol>`;
      js = `const list = document.getElementById('sortable'); list.addEventListener('click', event => { if (event.target.tagName === 'BUTTON') { const item = event.target.closest('li'); const sibling = event.target.textContent === '下移' ? item.nextElementSibling : item.previousElementSibling; if (sibling) list.insertBefore(event.target.textContent === '下移' ? sibling : item, event.target.textContent === '下移' ? item : sibling); } });`;
      jsx = `import { useState } from "react";
export default function Component() { const [items, setItems] = useState(["搜索", "筛选"]); const reverse = () => setItems([...items].reverse()); return <ol className="demo stack">{items.map(item => <li key={item}>{item}</li>)}<button onClick={reverse}>交换顺序</button></ol>; }`;
      break;
    case "lazy-loading":
      html = `<section class="demo stack"><p>继续滚动时，浏览器才加载下面的图片。</p><img loading="lazy" width="320" height="180" alt="蓝色渐变示例图" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Crect width='100%25' height='100%25' fill='%231769e0'/%3E%3C/svg%3E"></section>`;
      js = `document.querySelector('img').addEventListener('load', () => console.log('图片已加载'));`;
      jsx = `export default function Component() { return <section className="demo stack"><p>接近视口时加载图片。</p><img loading="lazy" width="320" height="180" alt="蓝色渐变示例图" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Crect width='100%25' height='100%25' fill='%231769e0'/%3E%3C/svg%3E" /></section>; }`;
      break;
    case "marquee":
      html = `<section class="demo stack" aria-label="合作品牌"><button type="button" aria-pressed="false">暂停滚动</button><div class="marquee"><div class="track">Nova · Prism · Dunes · Orbit</div></div></section>`;
      js = `const button = document.querySelector('.demo button'); button.addEventListener('click', () => { const paused = button.getAttribute('aria-pressed') !== 'true'; button.setAttribute('aria-pressed', String(paused)); document.querySelector('.track').classList.toggle('paused', paused); });`;
      extraCss = `.marquee { overflow: hidden; } .track { width: max-content; animation: marquee 8s linear infinite; } .paused { animation-play-state: paused; } @keyframes marquee { to { transform: translateX(-50%); } } @media (prefers-reduced-motion: reduce) { .track { animation: none; } }`;
      jsx = `import { useState } from "react";
export default function Component() { const [paused, setPaused] = useState(false); return <section className="demo stack"><button aria-pressed={paused} onClick={() => setPaused(!paused)}>暂停滚动</button><div className="marquee"><div className={paused ? "track paused" : "track"}>Nova · Prism · Dunes · Orbit</div></div></section>; }`;
      break;
    case "pan-and-zoom":
      html = `<section class="demo stack"><div class="canvas" tabindex="0">可缩放画布</div><div class="row"><button id="out" aria-label="缩小">−</button><output id="zoom">100%</output><button id="in" aria-label="放大">＋</button><button id="reset">复位</button></div></section>`;
      js = `let zoom = 100; const output = document.getElementById('zoom'); const render = () => { output.value = zoom + '%'; document.querySelector('.canvas').style.transform = 'scale(' + zoom / 100 + ')'; }; document.getElementById('in').onclick = () => { zoom = Math.min(200, zoom + 10); render(); }; document.getElementById('out').onclick = () => { zoom = Math.max(50, zoom - 10); render(); }; document.getElementById('reset').onclick = () => { zoom = 100; render(); };`;
      jsx = `import { useState } from "react";
export default function Component() { const [zoom, setZoom] = useState(100); return <section className="demo stack"><div className="canvas" style={{ transform: \`scale(\${zoom / 100})\` }}>可缩放画布</div><div className="row"><button aria-label="缩小" onClick={() => setZoom(Math.max(50, zoom - 10))}>−</button><output>{zoom}%</output><button aria-label="放大" onClick={() => setZoom(Math.min(200, zoom + 10))}>＋</button><button onClick={() => setZoom(100)}>复位</button></div></section>; }`;
      break;
    case "before-after-slider":
      html = `<section class="demo compare"><div class="after">之后</div><div class="before">之前</div><label for="reveal">对比位置 <output>50%</output></label><input id="reveal" type="range" min="0" max="100" value="50"></section>`;
      js = `const input = document.getElementById('reveal'); const before = document.querySelector('.before'); const output = document.querySelector('output'); input.addEventListener('input', () => { before.style.width = input.value + '%'; output.value = input.value + '%'; });`;
      extraCss = `.compare { position: relative; min-height: 10rem; overflow: hidden; } .after, .before { min-height: 6rem; display: grid; place-items: center; background: #1769e0; } .before { position: absolute; inset: 1rem auto auto 1rem; width: 50%; overflow: hidden; background: #7c3aed; } .compare label, .compare input { position: relative; z-index: 1; }`;
      jsx = `import { useState } from "react";
export default function Component() { const [value, setValue] = useState(50); return <section className="demo compare"><div className="after">之后</div><div className="before" style={{ width: value + "%" }}>之前</div><label>对比位置 <output>{value}%</output><input type="range" min="0" max="100" value={value} onChange={e => setValue(Number(e.target.value))} /></label></section>; }`;
      break;
  }

  return {
    vanilla: [
      codeFile("HTML", "html", html),
      codeFile("CSS", "css", `${baseCss}\n${extraCss}`),
      codeFile("JS", "js", js),
    ],
    react: [
      codeFile("Component.jsx", "jsx", jsx),
      codeFile("styles.css", "css", `${baseCss}\n${extraCss}`),
    ],
  };
}

const catalogSeeds: readonly CatalogSeed[] = [
  // 导航与定位（9）
  seed(
    "navigation-bar", "navigation", ALL, "导航栏", "Navigation Bar",
    "固定在页面顶部或显眼位置，承载品牌、主导航与全局操作。", "A prominent bar that holds branding, primary navigation, and global actions.",
    ["Navbar", "Top Bar", "App Bar", "顶部栏"], ["页面顶部菜单", "网站主导航", "横向导航", "macOS toolbar"],
    ["品牌区", "主导航链接", "全局操作"], "产品需要在主要区域之间持续切换时。", "单一任务页没有跨区导航时。",
    "使用 nav 与清晰的 aria-label，并用 aria-current 标记当前页面。", ["sidebar-navigation", "bottom-navigation", "toolbar"], "nav",
  ),
  seed(
    "sidebar-navigation", "navigation", WEB_DESKTOP, "侧边导航", "Sidebar Navigation",
    "沿页面侧边常驻的纵向导航，适合层级较多的产品。", "Persistent vertical navigation for products with many sections or nested destinations.",
    ["Sidebar", "Side Navigation", "Sidenav", "侧栏菜单"], ["左侧菜单", "后台管理导航", "纵向目录", "NavigationSplitView"],
    ["侧栏容器", "分组标题", "导航项"], "桌面端信息架构较深且空间充足时。", "小屏幕会被常驻侧栏挤压时。",
    "导航项可键盘聚焦，当前项使用 aria-current，折叠组同步 aria-expanded。", ["navigation-drawer", "navigation-bar", "side-sheet"], "nav",
  ),
  seed(
    "navigation-drawer", "navigation", WEB_MOBILE, "导航抽屉", "Navigation Drawer",
    "从屏幕边缘滑入并临时呈现导航选项的面板。", "A temporary navigation panel that slides in from a screen edge.",
    ["Nav Drawer", "Hamburger Menu", "抽屉菜单", "汉堡菜单"], ["点三条线展开菜单", "侧边滑出的导航", "移动端菜单", "DrawerLayout"],
    ["菜单触发器", "遮罩层", "导航面板"], "小屏需要节省空间但仍要访问全局导航时。", "主导航只有两三个项目且可直接显示时。",
    "触发器维护 aria-expanded/aria-controls；打开后管理焦点，Escape 关闭并恢复焦点。", ["sidebar-navigation", "side-sheet", "navigation-bar"], "menu",
  ),
  seed(
    "bottom-navigation", "navigation", ["mobile"], "底部导航", "Bottom Navigation",
    "位于移动设备底部，用图标与标签切换少量一级目的地。", "A mobile bar for switching among a small set of top-level destinations.",
    ["Bottom Nav", "Tab Bar", "底部标签栏", "UITabBar"], ["手机底部几个图标", "移动端主导航", "底部五个入口", "Material bottom navigation"],
    ["导航容器", "图标", "文字标签"], "移动应用有三到五个同级核心入口时。", "入口很多、层级复杂或操作只是临时动作时。",
    "每个图标配可见文字，当前页面用 aria-current，触控目标至少 44px。", ["navigation-bar", "tabs", "icon-button"], "nav",
  ),
  seed(
    "tabs", "navigation", ALL, "标签页", "Tabs",
    "在同一页面区域内切换一组彼此并列的内容面板。", "Switches between peer content panels without leaving the current context.",
    ["Tab View", "Tab Control", "页签", "NSTabView"], ["点击页签切换内容", "同一区域分组内容", "选项卡", "role tablist"],
    ["标签列表", "标签按钮", "内容面板"], "内容组彼此同级且用户一次只需查看一组时。", "内容需要同时比较或代表不同页面层级时。",
    "实现 tablist/tab/tabpanel 角色、方向键导航、aria-selected 与焦点管理。", ["segmented-control", "bottom-navigation", "accordion"], "tabs",
  ),
  seed(
    "breadcrumb", "navigation", WEB_DESKTOP, "面包屑", "Breadcrumb",
    "显示当前页面在层级结构中的路径，并允许返回上级。", "Shows the current page's location in a hierarchy and links back to ancestors.",
    ["Breadcrumb Trail", "路径导航", "面包屑导航"], ["首页大于分类大于详情", "显示页面层级路径", "返回上一级目录"],
    ["导航容器", "祖先链接", "当前页"], "网站层级较深且用户可能从中间页面进入时。", "扁平结构或只有一层页面时。",
    "使用 nav aria-label=面包屑 和有序列表；当前页设置 aria-current=page。", ["anchor-navigation", "pagination", "navigation-bar"], "nav",
  ),
  seed(
    "pagination", "navigation", WEB_DESKTOP, "分页器", "Pagination",
    "将长结果集拆成离散页面，并提供页码与前后跳转。", "Splits a long result set into pages with numbered and previous/next navigation.",
    ["Pager", "Page Control", "分页导航"], ["上一页下一页", "列表页码", "跳到第几页", "NSPageController"],
    ["上一页", "页码链接", "下一页"], "结果量大且用户需要稳定位置、可分享页码时。", "连续浏览体验比定位具体结果更重要时。",
    "用 nav 和可理解的链接文本；当前页使用 aria-current，禁用状态不能仅靠颜色表达。", ["infinite-scroll", "progress-stepper", "carousel"], "steps",
  ),
  seed(
    "progress-stepper", "navigation", ALL, "步骤进度条", "Progress Stepper",
    "显示多步骤流程的当前位置、已完成步骤与后续步骤。", "Shows progress, completed stages, and upcoming stages in a multi-step flow.",
    ["Stepper", "Steps", "Wizard Progress", "步骤条"], ["第一步第二步第三步", "表单流程进度", "向导步骤", "Material stepper"],
    ["步骤指示器", "步骤标签", "连接线"], "注册、结账等有明确顺序的多阶段任务时。", "步骤可任意切换或流程只有一步时。",
    "当前步骤用 aria-current=step，状态文字可读，不能只用颜色或图标区分。", ["progress-bar", "breadcrumb", "tabs"], "steps",
  ),
  seed(
    "anchor-navigation", "navigation", WEB_DESKTOP, "锚点导航 / 目录", "Anchor Navigation / Table of Contents",
    "列出长页面中的章节，并滚动到同页对应标题。", "Lists sections of a long page and jumps to headings within that page.",
    ["Table of Contents", "TOC", "On-page Navigation", "页内目录"], ["文章右侧目录", "点击标题滚到段落", "长页面章节导航", "锚点链接"],
    ["章节链接", "锚点目标", "当前位置指示"], "文档或长文章需要快速浏览章节时。", "页面很短或内容顺序必须逐步完成时。",
    "链接 href 指向唯一标题 id；处理固定头部偏移，并让目标标题可被聚焦。", ["breadcrumb", "sidebar-navigation", "scroll-snap"], "nav",
  ),

  // 操作与菜单（8）
  seed(
    "button", "actions", ALL, "按钮", "Button",
    "触发即时操作或提交任务的可点击控件。", "A control that triggers an immediate action or submits a task.",
    ["Push Button", "CTA", "操作按钮", "NSButton"], ["点击后执行操作", "保存提交按钮", "主要行动点", "call to action"],
    ["容器", "文字标签", "可选图标"], "用户要立即执行保存、提交、创建等动作时。", "目标是导航到另一个 URL 时，应使用链接。",
    "优先使用 button 元素，保留可见焦点，并以 disabled 属性表达不可用。", ["icon-button", "button-group", "split-button"], "button",
  ),
  seed(
    "icon-button", "actions", ALL, "图标按钮", "Icon Button",
    "仅用图标表示常见操作的紧凑按钮。", "A compact button that represents a familiar action with an icon.",
    ["Symbol Button", "Glyph Button", "图标操作", "NSButton imageOnly"], ["只有一个图标的按钮", "心形收藏", "垃圾桶删除", "圆形图标操作"],
    ["按钮容器", "图标", "可访问名称"], "操作很常见且空间有限时。", "图标含义陌生、歧义大或操作风险高时。",
    "通过可见文字、aria-label 或 aria-labelledby 提供名称；图标本身设 aria-hidden。", ["button", "toolbar", "tooltip"], "button",
  ),
  seed(
    "button-group", "actions", ALL, "按钮组", "Button Group",
    "将一组相关操作在视觉与语义上并排组织。", "Visually and semantically groups a set of related actions.",
    ["Grouped Buttons", "Action Group", "组合按钮"], ["几个按钮连在一起", "相关操作并排", "撤销重做按钮组", "NSButton group"],
    ["分组容器", "独立按钮", "选中或禁用状态"], "多个同级操作需要紧密表达关联时。", "操作彼此无关或按钮过多导致拥挤时。",
    "容器提供可访问分组名称，每个按钮仍有独立名称和键盘焦点。", ["segmented-control", "toolbar", "split-button"], "button",
  ),
  seed(
    "split-button", "actions", WEB_DESKTOP, "拆分按钮", "Split Button",
    "把默认动作与打开附加动作菜单的箭头组合在一起。", "Combines a primary default action with a separate menu of related alternatives.",
    ["Split Dropdown Button", "分裂按钮", "主按钮加下拉箭头"], ["按钮右边有小箭头", "默认操作和更多操作", "保存并另存为菜单"],
    ["主操作按钮", "菜单触发按钮", "附加动作菜单"], "存在高频默认动作和少量同类变体时。", "各动作同等重要或用户容易误触高风险默认动作时。",
    "两个按钮都可独立聚焦；菜单按钮设置 aria-haspopup、aria-expanded 和清楚名称。", ["button", "dropdown-menu", "button-group"], "button",
  ),
  seed(
    "toolbar", "actions", WEB_DESKTOP, "工具栏", "Toolbar",
    "集中排列当前内容或应用的常用操作。", "Collects frequently used actions for the current content or application.",
    ["Tool Bar", "Action Bar", "操作栏", "NSToolbar"], ["编辑器上面一排图标", "格式化操作栏", "应用窗口工具条", "role toolbar"],
    ["工具栏容器", "操作按钮", "可选分组或分隔线"], "同一工作区有多个高频操作时。", "只有一个主要动作或操作不相关时。",
    "使用 toolbar 角色和名称；支持方向键在内部移动且图标按钮具有可访问名称。", ["icon-button", "button-group", "overflow-menu"], "button",
  ),
  seed(
    "dropdown-menu", "actions", ALL, "下拉菜单", "Dropdown Menu",
    "由触发器打开并列出一组操作的临时菜单。", "A temporary action menu opened from a trigger.",
    ["Pull-down Menu", "Menu Button", "下拉操作菜单", "NSPopUpButton"], ["点击按钮下面出现菜单", "一列操作选项", "下拉更多动作", "aria-haspopup menu"],
    ["菜单触发器", "菜单容器", "菜单项"], "相关动作较多但无需常驻显示时。", "用户是在表单中选择一个值时，应优先 Select 或 Combobox。",
    "触发器同步 aria-expanded；菜单支持方向键、Home/End、Escape，并关闭后恢复焦点。", ["select", "combobox", "overflow-menu"], "menu",
  ),
  seed(
    "context-menu", "actions", WEB_DESKTOP, "上下文菜单", "Context Menu",
    "通过右键或长按，在目标附近显示与当前对象相关的操作。", "Shows object-specific actions near a target after right-click or long-press.",
    ["Right-click Menu", "Shortcut Menu", "右键菜单", "NSMenu"], ["右键出现的菜单", "长按弹出操作", "鼠标旁边的菜单", "对象快捷操作"],
    ["调用目标", "定位菜单", "上下文操作项"], "桌面式界面需要为选中对象提供快捷操作时。", "关键操作只能从此处访问或移动端缺少可发现入口时。",
    "同时提供可发现的按钮入口；支持 Shift+F10/Menu 键、键盘导航与 Escape。", ["dropdown-menu", "popover", "overflow-menu"], "menu",
  ),
  seed(
    "overflow-menu", "actions", ALL, "溢出菜单", "Overflow Menu",
    "把低频操作收纳到省略号或更多按钮后的菜单中。", "Moves lower-priority actions into a menu behind a More or ellipsis button.",
    ["More Menu", "Kebab Menu", "Ellipsis Menu", "更多菜单"], ["三个点按钮", "竖着的省略号菜单", "收起不常用操作", "more actions"],
    ["更多按钮", "菜单浮层", "次要操作项"], "操作较多且需要突出少数主要动作时。", "被收纳的是核心或高频操作时。",
    "更多按钮必须有可访问名称；不要仅朗读为省略号，并复用标准菜单键盘行为。", ["dropdown-menu", "toolbar", "icon-button"], "menu",
  ),

  // 文本与文件输入（9）
  seed(
    "text-field", "inputs", ALL, "文本框", "Text Field",
    "用于输入单行自由文本的带标签控件。", "A labeled control for entering a single line of free-form text.",
    ["Text Input", "Input Field", "文本输入框", "NSTextField"], ["输入姓名的框", "单行文字输入", "表单空白框", "input type text"],
    ["可见标签", "输入框", "帮助或错误文字"], "用户需要输入姓名、标题等短文本时。", "可选值有限且应从列表选择时。",
    "标签与 input 正确关联；错误通过 aria-describedby/aria-invalid 传达，不能只靠 placeholder。", ["textarea", "search-field", "inline-validation"], "field",
  ),
  seed(
    "textarea", "inputs", ALL, "多行文本框", "Textarea",
    "用于输入可换行长文本的可调整区域。", "A resizable control for entering longer, multi-line text.",
    ["Multiline Text Field", "Text Area", "多行输入", "NSTextView"], ["输入一大段文字", "评论内容框", "可以换行的输入框", "textarea rows"],
    ["标签", "多行编辑区", "字数或帮助提示"], "用户需要输入评论、描述或消息正文时。", "输入很短、固定格式或只需单行时。",
    "提供持久标签、合理大小和字数反馈；不要禁止浏览器缩放文本区域。", ["text-field", "truncated-text", "inline-validation"], "field",
  ),
  seed(
    "password-field", "inputs", ALL, "密码框", "Password Field",
    "遮蔽敏感文本，并可提供显示或隐藏密码操作。", "Masks sensitive text and may provide a show/hide password action.",
    ["Secure Text Field", "Password Input", "密码输入框", "NSSecureTextField"], ["输入密码显示圆点", "眼睛图标显示密码", "登录密码框", "autocomplete current-password"],
    ["密码标签", "遮蔽输入", "显示密码按钮"], "用户输入密码或类似机密字符串时。", "输入普通文本或验证码时。",
    "使用正确 autocomplete；显示按钮说明当前动作，切换后保持焦点与光标位置。", ["text-field", "otp-input", "inline-validation"], "field",
  ),
  seed(
    "search-field", "inputs", ALL, "搜索框", "Search Field",
    "接受查询文字并筛选或提交搜索结果。", "Accepts a query to filter content or submit a search.",
    ["Search Box", "Query Field", "搜索输入框", "NSSearchField"], ["带放大镜的输入框", "搜索内容", "输入关键词筛选", "input type search"],
    ["搜索标签", "查询输入", "清除或提交按钮"], "用户需要在大量内容中按文字查找时。", "选项很少并可直接浏览时。",
    "使用 search landmark 与可访问标签；清除按钮需命名，动态结果更新通过状态区适度通知。", ["combobox", "text-field", "anchor-navigation"], "field",
  ),
  seed(
    "spinbutton", "inputs", ALL, "数字微调框", "Spinbutton / Number Input",
    "输入数字并可通过增减按钮或方向键调整。", "Accepts a numeric value and supports incrementing or decrementing it.",
    ["Number Input", "Stepper Field", "Numeric Stepper", "NSStepper"], ["输入数量加号减号", "上下箭头调数字", "数字输入控件", "input type number"],
    ["数值输入", "增减控制", "单位或范围提示"], "数值有明确步长、最小值和最大值时。", "精确输入不重要且更适合直接拖动范围时。",
    "暴露当前值、最小最大值和单位；键盘支持方向键且错误信息可被读出。", ["slider", "text-field", "date-picker"], "field",
  ),
  seed(
    "masked-input", "inputs", ALL, "格式化输入框", "Masked Input",
    "按固定格式引导并格式化电话号码、卡号等输入。", "Guides and formats input that follows a fixed pattern such as a phone or card number.",
    ["Input Mask", "Formatted Field", "掩码输入", "格式输入框"], ["自动加空格的银行卡号", "电话号码格式", "固定格式输入", "输入掩码"],
    ["格式提示", "文本输入", "校验反馈"], "输入值具有稳定、用户熟悉的格式时。", "格式因地区变化大或遮罩会妨碍粘贴时。",
    "允许粘贴和删除；屏幕阅读器获得完整格式说明，视觉分隔符不应成为真实值。", ["text-field", "otp-input", "inline-validation"], "field",
  ),
  seed(
    "otp-input", "inputs", ALL, "验证码输入", "OTP / PIN Input",
    "输入一次性验证码或短 PIN，常以分隔字符位呈现。", "Captures a short one-time code or PIN, often shown as separated character slots.",
    ["One-time Code", "PIN Field", "Verification Code", "验证码格子"], ["六位验证码输入框", "一个数字一个格子", "短信验证码", "autocomplete one-time-code"],
    ["整体标签", "字符输入位", "重发或错误提示"], "验证流程需要输入短数字或字母代码时。", "普通密码或可变长度文本输入时。",
    "优先单一真实输入以支持粘贴和自动填充；设置 inputmode 与 autocomplete=one-time-code。", ["masked-input", "password-field", "text-field"], "field",
  ),
  seed(
    "tags-input", "inputs", WEB_DESKTOP, "标签输入框", "Tags Input",
    "输入多个短值，并把每个值转换成可移除的标签。", "Accepts multiple short values and turns each into a removable token.",
    ["Token Field", "Chip Input", "Tag Editor", "NSTokenField"], ["输入后变成标签", "多个收件人输入", "关键词小胶囊", "按回车添加标签"],
    ["已添加标签", "文本输入", "移除按钮"], "需要添加多个邮箱、关键词或分类值时。", "只有一个值或用户必须从严格列表选择时。",
    "每个移除按钮包含标签名；支持键盘添加、浏览与删除，并清楚播报变化。", ["chip", "combobox", "text-field"], "tags",
  ),
  seed(
    "file-upload", "inputs", ALL, "文件上传 / 拖放区", "File Upload / Drop Zone",
    "通过文件选择器或拖放接收本地文件。", "Accepts local files through a file picker or drag-and-drop target.",
    ["File Picker", "Drop Zone", "Uploader", "文件选择"], ["把文件拖到这里", "点击选择文件", "上传附件区域", "input type file"],
    ["选择按钮或拖放区", "格式大小说明", "文件列表与状态"], "用户需要附加图片、文档或其他本地文件时。", "内容可直接粘贴或通过已有云端资源选择时。",
    "拖放之外必须提供键盘可用的文件输入；显示文件限制、错误与上传状态。", ["progress-bar", "alert", "button"], "upload",
  ),

  // 选择与取值（10）
  seed(
    "checkbox", "selection", ALL, "复选框", "Checkbox",
    "独立开启一个选项，或从集合中选择零到多个项目。", "Toggles an independent option or selects zero or more items from a set.",
    ["Check Box", "Tickbox", "勾选框", "NSButton switch"], ["方框里打勾", "可多选的选项", "同意条款勾选", "input type checkbox"],
    ["方形控件", "选中标记", "文字标签"], "多个选项彼此独立，用户可以多选时。", "一组互斥选项只能选择一个时。",
    "使用原生 checkbox 与关联 label；混合状态设置 indeterminate/aria-checked=mixed。", ["radio-group", "switch", "chip"], "choice",
  ),
  seed(
    "radio-group", "selection", ALL, "单选按钮组", "Radio Group",
    "从一组互斥且通常可见的选项中选择一个。", "Selects one mutually exclusive option from a visible group.",
    ["Radio Buttons", "Option Group", "单选框", "NSButton radio"], ["几个圆圈只能选一个", "互斥选项", "选择配送方式", "input type radio"],
    ["组标题", "圆形控件", "选项标签"], "选项数量少且需要同时比较时。", "允许多选、选项很多或需要输入自定义值时。",
    "使用 fieldset/legend 或 radiogroup 名称；方向键移动，所有选项有可见标签。", ["checkbox", "select", "segmented-control"], "choice",
  ),
  seed(
    "switch", "selection", ALL, "开关", "Switch",
    "立即在开与关两种状态间切换设置。", "Immediately toggles a setting between on and off states.",
    ["Toggle Switch", "Toggle", "切换开关", "NSSwitch"], ["像电灯开关的控件", "左右滑动开关", "开启关闭设置", "role switch"],
    ["轨道", "滑块", "状态标签"], "改变会立即生效且只有开关两种状态时。", "需要用户确认提交或表示同意条款时。",
    "提供不随状态改变的标签并暴露 checked 状态；不能只用颜色表示开关。", ["checkbox", "segmented-control", "slider"], "choice",
  ),
  seed(
    "select", "selection", ALL, "选择框", "Select",
    "打开原生选项列表，并从预定义集合中选择一个值。", "Opens a native option list to choose one value from a predefined set.",
    ["Select Menu", "Picker", "下拉选择框", "NSPopUpButton"], ["点击后选一个值的下拉框", "表单选择项", "原生下拉选项", "select option"],
    ["可见标签", "当前值", "选项列表"], "选项稳定、不可自由输入且无需复杂搜索时。", "用户需要输入自定义值、搜索大量选项或执行动作时。",
    "优先原生 select；标签关联明确，选项文字可区分，避免把不可用占位项当标签。", ["dropdown-menu", "combobox", "radio-group"], "choice",
  ),
  seed(
    "combobox", "selection", ALL, "组合框 / 自动补全", "Combobox / Autocomplete",
    "把文本输入与建议列表结合，支持搜索并选择或创建值。", "Combines text input with suggestions so users can search and select or enter a value.",
    ["Autocomplete", "Typeahead", "Searchable Select", "自动完成", "NSComboBox"], ["输入文字出现建议", "可搜索的下拉框", "边打字边筛选选项", "aria combobox"],
    ["文本输入", "展开按钮", "建议列表"], "选项很多、需要搜索或允许自定义输入时。", "选项很少且简单 Select 或单选组更清楚时。",
    "正确维护 combobox、aria-expanded、aria-controls、aria-activedescendant，并支持方向键与 Escape。", ["select", "search-field", "dropdown-menu"], "choice",
  ),
  seed(
    "segmented-control", "selection", ALL, "分段控制器", "Segmented Control",
    "在紧凑的相邻分段中切换少量互斥视图或模式。", "Switches among a few mutually exclusive views or modes in adjacent segments.",
    ["Segmented Button", "Toggle Group", "分段选择器", "NSSegmentedControl"], ["几个连在一起的选项", "列表网格切换", "胶囊形模式切换", "segmented picker"],
    ["控件容器", "分段按钮", "选中状态"], "有二到五个短标签的同级模式需要快速切换时。", "选项多、标签长或内容属于页面级导航时。",
    "采用 radio group 或 tabs 的完整语义；选中状态不能只由背景色表达。", ["tabs", "radio-group", "button-group"], "choice",
  ),
  seed(
    "slider", "selection", ALL, "滑块", "Slider",
    "拖动轨道上的滑块，在连续或分级范围中选择单个值。", "Chooses one value from a continuous or stepped range by moving a thumb along a track.",
    ["Range Input", "Trackbar", "Seek Bar", "滑杆", "NSSlider"], ["可以拖动的圆点", "拖动调节音量", "横条上移动滑块", "input type range"],
    ["轨道", "已选范围", "滑块 / Thumb"], "用户更关心相对大小，且可通过拖动快速调整时。", "必须精确输入数值或范围没有合理上下界时。",
    "提供名称、当前值和单位；支持方向键、PageUp/Down，并提供可替代的精确输入。", ["range-slider", "progress-bar", "spinbutton"], "slider",
  ),
  seed(
    "range-slider", "selection", ALL, "范围滑块", "Range Slider",
    "用两个滑块设置最小值与最大值，选择一个区间。", "Uses two thumbs to choose a minimum and maximum range.",
    ["Dual-thumb Slider", "Interval Slider", "双滑块", "Range Seek Bar"], ["两个可以拖动的圆点", "选择价格区间", "最小最大范围", "双端滑块"],
    ["轨道", "下限滑块", "上限滑块"], "用户需要用大致区间筛选价格、时间或尺寸时。", "只需一个值或上下限必须精确输入时。",
    "两个滑块各有明确名称和可读数值，键盘可分别操作，且防止上下限含义混乱。", ["slider", "spinbutton", "progress-bar"], "slider",
  ),
  seed(
    "date-picker", "selection", ALL, "日期选择器", "Date Picker",
    "通过日历或结构化输入选择单个日期。", "Selects a date through a calendar view or structured input.",
    ["Calendar Picker", "Date Field", "日期控件", "NSDatePicker"], ["点日历选择日期", "出生日期输入", "弹出月份日历", "input type date"],
    ["日期输入", "日历触发器", "日期网格"], "任务需要合法日期且浏览相邻日期有帮助时。", "用户更适合直接键入熟悉日期或只需选择月份时。",
    "允许键盘直接输入；日历网格支持方向键，完整朗读年月日与不可选原因。", ["calendar-view", "text-field", "select"], "picker",
  ),
  seed(
    "color-picker", "selection", WEB_DESKTOP, "颜色选择器", "Color Picker",
    "通过色板、光谱或数值选择颜色。", "Chooses a color through swatches, a spectrum, or numeric values.",
    ["Color Well", "Colour Picker", "取色器", "NSColorPanel"], ["选择颜色的小方块", "彩虹取色盘", "输入十六进制颜色", "input type color"],
    ["当前色样", "色彩选择区", "颜色数值"], "编辑器需要选择品牌色、画笔色或外观色时。", "颜色仅有少量固定合法值时，应直接展示色样选项。",
    "每个色样有文字名称或数值；支持键盘与文本格式，并提示对比度问题。", ["radio-group", "popover", "text-field"], "picker",
  ),

  // 反馈与状态（9）
  seed(
    "alert", "feedback", ALL, "警告提示", "Alert",
    "在页面内突出需要注意的重要信息或状态。", "Prominently communicates important information or status within a page.",
    ["Banner Alert", "Callout", "提示条", "NSAlert"], ["页面上的警告框", "黄色提示信息", "重要错误提示", "role alert"],
    ["状态图标", "标题与说明", "可选操作"], "信息重要且需要持续可见或要求用户处理时。", "短暂成功反馈不需要打断阅读时。",
    "紧急动态信息可用 role=alert；静态内容避免重复播报，图标之外提供文字。", ["toast", "inline-validation", "alert-dialog"], "feedback",
  ),
  seed(
    "toast", "feedback", ALL, "浮动通知", "Toast",
    "短暂浮现并自动消失的非阻塞状态消息。", "A brief, non-blocking message that appears temporarily and then dismisses.",
    ["Toast Notification", "Growl", "轻提示", "HUD"], ["右上角自动消失的消息", "操作成功小弹窗", "短暂通知", "保存成功提示"],
    ["浮动容器", "状态文字", "可选关闭按钮"], "操作结果简单、低风险且无需立即处理时。", "消息很长、包含关键错误或用户必须采取行动时。",
    "使用适当 live region，停留时间足够且可暂停；不要把焦点强制移入通知。", ["snackbar", "alert", "popover"], "feedback",
  ),
  seed(
    "snackbar", "feedback", ALL, "底部操作通知", "Snackbar",
    "通常出现在底部的短暂消息，并可带一个相关操作。", "A temporary message, usually near the bottom, with an optional contextual action.",
    ["Action Toast", "Bottom Toast", "操作提示条", "Material Snackbar"], ["底部弹出撤销消息", "删除后可撤销", "带操作的短暂提示", "snackbar undo"],
    ["消息文字", "单一操作", "临时容器"], "刚完成的操作可撤销或有一个清晰后续动作时。", "需要多个按钮、长说明或阻止后续流程时。",
    "消息由 status 区域播报；操作可键盘访问，超时不能让用户失去关键机会。", ["toast", "alert", "button"], "feedback",
  ),
  seed(
    "inline-validation", "feedback", ALL, "行内校验", "Inline Validation",
    "在输入控件附近说明错误、成功或格式要求。", "Explains an error, success state, or requirement next to the relevant field.",
    ["Field Error", "Validation Message", "表单错误提示"], ["输入框下面红色错误", "表单即时校验", "必填项提示", "aria-invalid"],
    ["字段状态", "错误文字", "修复提示"], "用户需要知道具体字段为何无效以及如何修复时。", "用它替代所有提交时汇总，导致用户找不到其他错误时。",
    "设置 aria-invalid 并由 aria-describedby 关联错误；提交后将焦点引导到错误摘要或首个错误。", ["text-field", "alert", "masked-input"], "feedback",
  ),
  seed(
    "progress-bar", "feedback", ALL, "进度条", "Progress Bar",
    "显示耗时操作已经完成的比例，或表达不确定的进行状态。", "Shows how much of a time-consuming operation is complete, or that it is still in progress.",
    ["Progress Indicator", "Loading Bar", "进度指示器", "NSProgressIndicator"], ["显示百分比的横条", "上传进度", "任务完成多少", "progress element"],
    ["轨道", "填充条", "数值或状态标签"], "操作需要明显等待且能估算或表达进度时。", "操作几乎即时完成或它其实用于选择数值时。",
    "使用 progress 或 progressbar，提供名称与 aria-valuenow；不要只依赖动画表达状态。", ["spinner", "slider", "progress-stepper"], "progress",
  ),
  seed(
    "spinner", "feedback", ALL, "加载指示器", "Spinner",
    "用循环动画表示正在处理但无法估算完成时间。", "Uses a looping animation to show work in progress when completion cannot be estimated.",
    ["Activity Indicator", "Throbber", "Loading Spinner", "NSProgressIndicator spinning"], ["转圈加载", "菊花加载动画", "等待中的圆圈", "loading indicator"],
    ["旋转图形", "状态文字", "状态容器"], "等待超过瞬间且无法提供确定进度时。", "可计算进度、加载很慢且需要骨架布局时。",
    "动画图形设为 aria-hidden，旁边提供 role=status 的文字；支持减少动态偏好。", ["progress-bar", "skeleton-screen", "lazy-loading"], "progress",
  ),
  seed(
    "skeleton-screen", "feedback", ALL, "骨架屏", "Skeleton Screen",
    "用内容形状占位，预示正在加载的页面结构。", "Uses placeholder shapes to preview the layout while content is loading.",
    ["Skeleton Loader", "Content Placeholder", "骨架加载"], ["灰色闪动占位块", "内容加载前的假布局", "卡片骨架", "shimmer loading"],
    ["文本占位条", "媒体占位块", "加载容器"], "内容布局稳定且等待时间足以感知时。", "无法预测最终布局或会造成内容跳动误导时。",
    "骨架对辅助技术隐藏，并提供简洁的加载状态；减少动态模式关闭闪烁动画。", ["spinner", "lazy-loading", "empty-state"], "progress",
  ),
  seed(
    "badge", "feedback", ALL, "徽标", "Badge",
    "附着于对象旁的短状态、计数或分类标记。", "A compact status, count, or classification indicator attached to another object.",
    ["Count Badge", "Status Badge", "徽章", "Notification Badge"], ["图标右上角红点数字", "未读消息数量", "状态小标签", "NEW 标记"],
    ["紧凑容器", "短文字或数字", "关联对象"], "需要快速扫描状态、数量或简短类别时。", "内容可点击、可移除或需要承载长文本时。",
    "确保含义在可访问名称中，纯装饰红点不应成为唯一状态来源。", ["chip", "avatar", "toast"], "feedback",
  ),
  seed(
    "empty-state", "feedback", ALL, "空状态", "Empty State",
    "当区域没有数据时解释原因，并引导用户下一步。", "Explains why an area has no content and guides the user toward a useful next step.",
    ["Blank Slate", "Zero State", "无数据状态", "空白页"], ["这里还没有内容", "列表为空的提示", "第一次使用引导", "no results"],
    ["标题", "原因或说明", "可选主要操作"], "列表初次为空、筛选无结果或内容已清空时。", "系统仍在加载或发生错误但被误称为空时。",
    "标题清楚描述状态，操作是标准按钮或链接；插图不能承担必要信息。", ["skeleton-screen", "alert", "search-field"], "feedback",
  ),

  // 浮层与展开（9）
  seed(
    "dialog", "overlays", ALL, "对话框", "Dialog",
    "在当前页面上方打开一个需要集中处理的独立任务容器。", "Opens a focused task container above the current page.",
    ["Modal", "Modal Dialog", "模态框", "NSPanel"], ["中间弹出的窗口", "背景变暗的弹窗", "需要关闭的浮层", "dialog showModal"],
    ["遮罩", "对话框容器", "标题内容与操作"], "短任务需要保持原页面上下文并集中注意力时。", "内容复杂、需要分享 URL 或长时间工作时。",
    "提供名称，打开时移动焦点并限制在内部；Escape 关闭后焦点回到触发器。", ["alert-dialog", "side-sheet", "popover"], "overlay",
  ),
  seed(
    "alert-dialog", "overlays", ALL, "警告对话框", "Alert Dialog",
    "要求用户确认高风险、不可逆或阻塞性决定的对话框。", "A dialog that requires a decision about a high-risk, destructive, or blocking action.",
    ["Confirmation Dialog", "Confirm Modal", "确认弹窗", "NSAlert"], ["确定要删除吗弹窗", "取消确定两个按钮", "不可撤销警告", "role alertdialog"],
    ["警告标题", "后果说明", "取消与确认操作"], "删除、覆盖等行为后果严重且无法轻易撤销时。", "普通成功消息或低风险、可撤销操作时。",
    "使用 alertdialog 与清楚标题；初始焦点置于最安全操作，并避免含糊的确定/取消标签。", ["dialog", "alert", "snackbar"], "overlay",
  ),
  seed(
    "popover", "overlays", ALL, "弹出层", "Popover",
    "锚定触发元素，显示较丰富的临时内容或少量控件。", "Displays temporary, moderately rich content anchored to a trigger.",
    ["Pop-over", "Callout", "气泡浮层", "NSPopover"], ["按钮旁边出现的小面板", "锚定元素的浮层", "点击外部关闭", "popover attribute"],
    ["触发器", "锚点定位", "弹出内容"], "补充信息或小任务与某个具体元素直接相关时。", "内容只是短文字提示或任务需要完整页面时。",
    "触发器同步展开状态；浮层可键盘访问，Escape 与外部关闭后恢复合理焦点。", ["tooltip", "hover-card", "dialog"], "overlay",
  ),
  seed(
    "tooltip", "overlays", WEB_DESKTOP, "工具提示", "Tooltip",
    "悬停或聚焦时显示简短、非交互的补充说明。", "Shows brief, non-interactive help on hover or keyboard focus.",
    ["Tool Tip", "Hint Bubble", "悬浮提示", "NSToolTip"], ["鼠标放上去显示文字", "图标的悬停说明", "小黑色提示气泡", "role tooltip"],
    ["触发元素", "短说明", "定位箭头"], "图标含义需要补充，但主要界面仍可独立理解时。", "内容重要、可交互、很长或只在触摸设备上提供时。",
    "同时响应 hover 与 focus；由 aria-describedby 关联，允许移入提示且 Escape 可关闭。", ["popover", "hover-card", "icon-button"], "overlay",
  ),
  seed(
    "hover-card", "overlays", WEB_DESKTOP, "悬浮信息卡", "Hover Card",
    "悬停或聚焦链接时显示相关实体的丰富预览。", "Shows a richer preview of a linked entity on hover or focus.",
    ["Preview Card", "Profile Card", "悬停卡片"], ["鼠标放用户名显示资料卡", "链接内容预览", "悬停显示详细信息", "rich hover preview"],
    ["触发链接", "预览卡片", "标题与元数据"], "无需离开当前页面即可快速预览人物或资源时。", "卡片包含复杂任务，或触屏上没有等价入口时。",
    "支持键盘聚焦与可移入内容；不遮挡触发器，Escape 关闭，触屏可通过点击访问。", ["tooltip", "popover", "card"], "overlay",
  ),
  seed(
    "side-sheet", "overlays", ALL, "侧边面板", "Side Sheet",
    "从屏幕边缘覆盖或推动内容，用于补充任务或详情。", "Slides in from an edge to host a secondary task or contextual details.",
    ["Drawer", "Slide-over", "Inspector Panel", "侧滑面板"], ["右侧滑出的详情", "侧边编辑面板", "抽屉式表单", "sheet panel"],
    ["边缘面板", "标题与关闭操作", "任务内容"], "需要参考主内容完成短编辑或查看详情时。", "它承载全局导航，或任务复杂到需要独立页面时。",
    "模态模式管理焦点和 Escape；非模态模式保持阅读顺序，关闭后恢复触发焦点。", ["navigation-drawer", "dialog", "sidebar-navigation"], "overlay",
  ),
  seed(
    "accordion", "overlays", ALL, "手风琴", "Accordion",
    "由多个标题组成，每个标题可展开或收起对应内容区。", "A set of headings that expand or collapse their associated content panels.",
    ["Accordion View", "Expansion Panels", "折叠面板组"], ["一组可以展开的标题", "常见问题折叠列表", "只显示一段内容", "accordion panels"],
    ["标题按钮", "展开图标", "内容面板"], "长页面有多个平级区块，用户通常只关注少数时。", "用户需要同时比较所有区块或内容很短时。",
    "标题使用 button，维护 aria-expanded/aria-controls；标题层级正确且内容仍在合理阅读顺序中。", ["disclosure", "tabs", "anchor-navigation"], "disclosure",
  ),
  seed(
    "disclosure", "overlays", ALL, "展开 / 收起", "Disclosure / Collapsible",
    "单个触发器显示或隐藏一块附加内容。", "A single trigger that reveals or hides an additional content region.",
    ["Collapsible", "Expander", "展开详情", "DisclosureGroup"], ["点击查看更多展开", "小箭头展开内容", "显示隐藏一段", "details summary"],
    ["展开触发器", "状态图标", "内容区域"], "附加详情是可选的，并与触发器直接相关时。", "存在多个同级面板需要统一组织时，应使用 Accordion。",
    "优先 details/summary 或 button；同步 aria-expanded，隐藏内容不应进入键盘顺序。", ["accordion", "truncated-text", "popover"], "disclosure",
  ),
  seed(
    "lightbox", "overlays", ALL, "灯箱", "Lightbox",
    "在遮罩层上放大媒体，并可浏览相邻媒体。", "Enlarges media over a dimmed backdrop and may navigate between adjacent items.",
    ["Image Viewer", "Media Viewer", "图片灯箱", "Quick Look"], ["点击图片全屏放大", "背景变暗看大图", "左右切换照片", "photo overlay"],
    ["遮罩", "放大媒体", "关闭与前后导航"], "缩略图需要不离开页面即可查看大图时。", "媒体需要复杂编辑、下载信息或独立可分享页面时。",
    "实现对话框焦点规则；图片有替代文本，前后与关闭按钮有名称，支持 Escape。", ["image-gallery", "carousel", "dialog"], "overlay",
  ),

  // 内容与媒体（7）
  seed(
    "card", "content", ALL, "卡片", "Card",
    "把一个主题的标题、内容和操作组织成独立视觉单元。", "Groups a single topic's title, content, and actions into a distinct visual unit.",
    ["Content Card", "Tile", "Panel", "内容卡片"], ["一块一块的内容", "商品信息卡", "带阴影的矩形模块", "card layout"],
    ["容器", "标题与媒体", "正文与操作"], "列表中每项有清晰边界且包含多种内容时。", "每行只有简单文本，或把所有卡片都做成巨大点击目标时。",
    "保持语义标题层级；若整卡可点击，内部不要再嵌套交互控件。", ["list-item", "hover-card", "carousel"], "content",
  ),
  seed(
    "list-item", "content", ALL, "列表 / 列表项", "List / List Item",
    "以重复行展示同类内容，每行可包含主文字、元数据与操作。", "Presents repeated, similar content as rows with primary text, metadata, and actions.",
    ["List View", "Row", "列表行", "NSTableView row"], ["一行一条数据", "联系人列表", "设置项列表", "ul li"],
    ["列表容器", "主内容", "辅助信息或操作"], "项目结构相似且用户需要纵向快速扫描时。", "项目差异很大或需要二维列比较时。",
    "使用 ul/ol 和 li；交互只放在真实链接或按钮上，并保留清楚的项目名称。", ["card", "data-table", "infinite-scroll"], "content",
  ),
  seed(
    "avatar", "content", ALL, "头像", "Avatar",
    "用人物照片、首字母或图标表示用户或实体。", "Represents a person or entity with a photo, initials, or icon.",
    ["Profile Image", "Userpic", "用户头像", "NSImageView"], ["圆形用户照片", "名字首字母圆圈", "个人资料图", "profile picture"],
    ["图片或首字母", "形状容器", "可选状态徽标"], "需要在列表、评论或账户入口中快速识别人时。", "真实身份很重要但头像可能不准确或相似时。",
    "信息性图片提供姓名替代文本；若旁边已有同名文字，可将头像标为装饰。", ["badge", "card", "list-item"], "content",
  ),
  seed(
    "chip", "content", ALL, "标签胶囊", "Chip",
    "用紧凑胶囊展示属性、筛选条件或可移除的小对象。", "A compact pill that represents an attribute, filter, or removable object.",
    ["Tag", "Pill", "Token", "标签"], ["胶囊形小标签", "可删除的筛选条件", "关键词标签", "Material chip"],
    ["胶囊容器", "短标签", "可选图标或移除按钮"], "需要紧凑呈现少量属性、已选筛选项或对象时。", "只是被动状态计数，或标签文字很长时。",
    "可操作 Chip 使用 button；移除按钮说明对象名称，选中状态不只靠颜色。", ["badge", "tags-input", "segmented-control"], "content",
  ),
  seed(
    "carousel", "content", ALL, "轮播", "Carousel",
    "在有限视口内一次展示一个或少量内容，并前后切换。", "Shows one or a few items in a constrained viewport with previous and next navigation.",
    ["Slider", "Slideshow", "Pager", "轮播图", "UIPageViewController"], ["左右箭头切换卡片", "自动播放横幅", "一张一张滑动", "image slider"],
    ["幻灯片视口", "前后按钮", "位置指示器"], "一组同类媒体适合按顺序轻量浏览时。", "每项都很重要、需要比较，或自动轮播会隐藏内容时。",
    "提供暂停、前后和位置说明；键盘焦点不应被换页打断，并尊重减少动态偏好。", ["image-gallery", "lightbox", "scroll-snap"], "content",
  ),
  seed(
    "image-gallery", "content", ALL, "图片画廊", "Image Gallery",
    "以网格或缩略图集合展示多张相关图片。", "Displays a collection of related images as a grid or set of thumbnails.",
    ["Photo Gallery", "Thumbnail Grid", "照片墙"], ["多张图片网格", "缩略图列表", "相册页面", "photo grid"],
    ["画廊容器", "缩略图", "图片说明"], "用户需要纵览、选择或打开多张图片时。", "图片只有一张或必须按严格线性顺序观看时。",
    "每张图具有恰当替代文本；打开大图使用真实按钮或链接并显示可见焦点。", ["lightbox", "carousel", "lazy-loading"], "content",
  ),
  seed(
    "truncated-text", "content", ALL, "截断文字 / 展开更多", "Truncated Text / Show More",
    "先限制长文字显示行数，再由用户展开查看完整内容。", "Initially limits long text and lets the user reveal the full content.",
    ["Read More", "Line Clamp", "Show More", "省略文字"], ["文字末尾三个点", "展开全文", "超过两行省略", "line clamp"],
    ["被截断文本", "渐隐或省略提示", "展开收起按钮"], "长描述会打断列表扫描，但完整内容仍需就地访问时。", "截断会隐藏关键决策信息或文字本来很短时。",
    "使用有明确名称的 button，同步 aria-expanded；全文在展开后仍保持自然阅读顺序。", ["disclosure", "textarea", "card"], "disclosure",
  ),

  // 数据展示（6）
  seed(
    "data-table", "data", WEB_DESKTOP, "数据表格", "Data Table",
    "用行和列展示结构化数据，便于扫描与比较。", "Displays structured data in rows and columns for scanning and comparison.",
    ["Table", "Tabular Data", "数据表", "NSTableView"], ["有表头的行列数据", "报表表格", "按列比较数据", "HTML table"],
    ["表格标题", "列标题", "数据行与单元格"], "数据具有稳定字段且用户需要跨行跨列比较时。", "内容是简单列表或移动端无法保留关键列时。",
    "使用原生 table、caption 和正确 th scope；复杂表头提供清晰关联，容器可横向滚动。", ["data-grid", "list-item", "chart"], "data",
  ),
  seed(
    "data-grid", "data", WEB_DESKTOP, "数据网格", "Data Grid",
    "像电子表格一样支持选择、编辑、排序或键盘导航的数据表。", "An interactive, spreadsheet-like table supporting selection, editing, sorting, or grid navigation.",
    ["Grid", "Interactive Table", "Spreadsheet Grid", "表格控件"], ["可以编辑的表格", "像 Excel 的网格", "单元格键盘移动", "role grid"],
    ["网格标题", "可交互行", "可聚焦单元格"], "用户需要直接操作大量二维数据而非只阅读时。", "数据只读且原生表格已足够时。",
    "仅在需要网格交互时使用 role=grid；实现方向键、选择状态、编辑模式与焦点指示。", ["data-table", "tree-view", "calendar-view"], "data",
  ),
  seed(
    "tree-view", "data", WEB_DESKTOP, "树形视图", "Tree View",
    "以可展开节点呈现文件夹、目录等层级数据。", "Presents hierarchical data as expandable parent and child nodes.",
    ["Tree", "Outline View", "Folder Tree", "NSOutlineView"], ["文件夹一层一层展开", "层级目录树", "左侧文件树", "role tree"],
    ["根容器", "父节点", "子节点组"], "用户需要浏览和操作深层级对象时。", "层级很浅、内容主要用于页面导航或移动端空间有限时。",
    "实现 tree/treeitem/group 语义、方向键展开与移动、aria-level/expanded/selected。", ["sidebar-navigation", "data-grid", "disclosure"], "data",
  ),
  seed(
    "timeline", "data", ALL, "时间线", "Timeline",
    "按时间顺序排列事件，并强调先后关系。", "Arranges events chronologically and emphasizes their sequence over time.",
    ["Activity Stream", "Event Timeline", "时间轴"], ["一条线串起多个事件", "历史记录按时间排列", "物流进度时间轴", "chronological events"],
    ["时间标记", "连接线", "事件内容"], "事件顺序和时间间隔是理解内容的关键时。", "用户更需要按字段比较或事件没有明确时间时。",
    "使用有序列表和可读时间元素；视觉连线设为装饰，顺序不能只靠位置表达。", ["progress-stepper", "list-item", "calendar-view"], "data",
  ),
  seed(
    "calendar-view", "data", ALL, "日历视图", "Calendar View",
    "以日、周或月网格展示日期及其事件。", "Displays dates and events in a day, week, or month grid.",
    ["Month View", "Schedule Calendar", "月历", "NSCalendarView"], ["整个月的日历", "每一天显示日程", "周视图时间表", "calendar grid"],
    ["日期标题", "时间网格", "事件项目"], "日期位置、冲突或时间分布是主要信息时。", "用户只需选一个日期，或事件更适合线性列表时。",
    "提供列表替代视图；日期与事件有完整名称，网格键盘导航和焦点位置可预测。", ["date-picker", "timeline", "data-grid"], "data",
  ),
  seed(
    "chart", "data", ALL, "图表", "Chart",
    "用柱、线、点或区域等视觉编码呈现数值关系。", "Uses bars, lines, points, or areas to visualize quantitative relationships.",
    ["Graph", "Data Visualization", "统计图", "Charts"], ["柱状图折线图", "数据显示成图形", "趋势图", "数据可视化"],
    ["标题", "坐标或比例尺", "数据标记与图例"], "趋势、分布或比较比精确逐项读取更重要时。", "数据量很小或精确值是唯一重点时。",
    "提供文字摘要和数据表；颜色不是唯一编码，标记、轴与图例具有足够对比度。", ["data-table", "timeline", "progress-bar"], "data",
  ),

  // 动效与交互模式（8）
  seed(
    "drag-and-drop", "motion", ALL, "拖放 / 排序", "Drag and Drop / Sortable",
    "拖动物体到目标位置，以移动、上传或重新排序。", "Moves, uploads, or reorders an object by dragging it to a target position.",
    ["DnD", "Sortable", "Reorder", "拖拽排序"], ["拖着卡片换位置", "拖文件到区域", "列表上下排序", "drag handle"],
    ["可拖动对象", "拖动把手", "放置目标与位置提示"], "直接空间操作能明显简化移动或排序任务时。", "精确拖动困难、操作风险高或没有替代方式时。",
    "提供上移下移按钮或键盘操作；播报抓取、目标位置和完成结果，触控目标足够大。", ["file-upload", "list-item", "data-grid"], "motion",
  ),
  seed(
    "infinite-scroll", "motion", WEB_MOBILE, "无限滚动", "Infinite Scroll",
    "接近列表末尾时自动继续加载内容，形成连续浏览流。", "Automatically loads more content near the end of a list for continuous browsing.",
    ["Endless Scroll", "Continuous Feed", "无限列表"], ["往下滑自动加载更多", "没有分页的内容流", "刷不完的列表", "intersection observer feed"],
    ["内容流", "加载触发点", "加载与结束状态"], "内容用于探索且用户无需定位具体页码时。", "用户需要稳定位置、到达页脚或比较特定结果时。",
    "提供加载更多按钮作为替代，维护焦点和浏览器返回位置，并清楚播报新内容数量。", ["pagination", "lazy-loading", "list-item"], "viewport",
  ),
  seed(
    "lazy-loading", "motion", ALL, "延迟加载", "Lazy Loading",
    "仅在内容接近视口或真正需要时加载资源。", "Loads resources only when they approach the viewport or are actually needed.",
    ["Deferred Loading", "On-demand Loading", "懒加载"], ["滚到图片才开始加载", "按需加载内容", "首屏之外延后加载", "loading lazy"],
    ["占位区域", "观察触发点", "真实内容"], "页面包含大量首屏外图片或昂贵内容时。", "延迟会阻碍首屏关键内容、搜索索引或必要交互时。",
    "为图片保留尺寸与替代文本，提供加载/错误状态，不能让键盘用户跳过未加载内容。", ["skeleton-screen", "infinite-scroll", "image-gallery"], "viewport",
  ),
  seed(
    "marquee", "motion", WEB_DESKTOP, "跑马灯", "Marquee",
    "让一列内容水平循环滚动，形成连续展示带。", "Continuously scrolls a strip of content horizontally in a loop.",
    ["Ticker", "Scrolling Banner", "滚动字幕", "走马灯"], ["文字从右往左一直滚", "品牌 logo 无限循环", "横向滚动公告", "news ticker"],
    ["裁切视口", "重复内容轨道", "暂停控制"], "内容是装饰性品牌带或非关键实时摘要，且静态版本仍可用时。", "包含必须阅读的信息或用户无法暂停时。",
    "提供暂停按钮，悬停和聚焦时暂停；减少动态偏好下改为静态，重复副本对辅助技术隐藏。", ["carousel", "scroll-snap", "toast"], "motion",
  ),
  seed(
    "parallax-scrolling", "motion", WEB_DESKTOP, "视差滚动", "Parallax Scrolling",
    "滚动时让前景与背景以不同速度移动，营造深度。", "Moves foreground and background at different speeds during scroll to suggest depth.",
    ["Parallax", "Scroll Depth", "滚动视差"], ["滚动时背景移动比较慢", "网页有景深效果", "分层滚动动画", "scroll parallax"],
    ["滚动容器", "前景层", "背景层"], "品牌叙事需要少量非关键深度效果时。", "内容密集、性能受限、易晕动或动效妨碍阅读时。",
    "减少动态偏好下停用；不改变阅读顺序，避免大幅持续移动与滚动劫持。", ["scroll-snap", "marquee", "pan-and-zoom"], "motion",
  ),
  seed(
    "scroll-snap", "motion", ALL, "滚动吸附", "Scroll Snap",
    "滚动结束时把视口对齐到最近的项目或章节。", "Aligns the viewport to the nearest item or section after scrolling.",
    ["Paging Scroll", "Snap Scrolling", "滚动分页"], ["滑一下自动对齐下一张", "横向卡片吸附", "滚动停在整屏位置", "CSS scroll-snap"],
    ["滚动容器", "吸附项目", "对齐位置"], "触屏浏览同尺寸卡片或幻灯片，需要稳定对齐时。", "内容尺寸不一、用户需要自由精细滚动时。",
    "不要捕获正常键盘滚动；焦点项目保持可见，并尊重减少动态偏好。", ["carousel", "anchor-navigation", "parallax-scrolling"], "viewport",
  ),
  seed(
    "pan-and-zoom", "motion", ALL, "平移与缩放", "Pan and Zoom",
    "通过拖动、滚轮、手势或按钮浏览大画布并改变比例。", "Navigates a large canvas through panning and changes scale through gestures or controls.",
    ["Zoomable Canvas", "Pinch to Zoom", "缩放画布"], ["拖动画布查看不同位置", "双指放大地图", "滚轮缩放图片", "zoom controls"],
    ["可视窗口", "大型画布", "缩放与复位控制"], "地图、图表或大图无法在一个视口完整显示时。", "普通页面内容可以自然重排，或缩放会隐藏关键操作时。",
    "提供明确的放大、缩小、复位按钮和键盘方式；播报缩放比例并避免与页面缩放冲突。", ["lightbox", "chart", "before-after-slider"], "viewport",
  ),
  seed(
    "before-after-slider", "motion", ALL, "前后对比滑块", "Before–After Slider",
    "拖动分隔把手，连续揭示同一区域的前后两幅图。", "Drags a divider to reveal before and after versions of the same scene.",
    ["Image Comparison Slider", "Comparison Reveal", "图片对比滑杆"], ["拖动中线对比两张图", "装修前后图片", "图片左右对比", "左右揭示效果", "before after image"],
    ["前图", "后图裁切层", "可拖动分隔把手"], "两张图严格对齐，局部差异需要直观比较时。", "图片构图不同、需要精确并排比较或差异不只靠视觉时。",
    "把手实现 slider 语义和键盘控制；两图有替代说明，并提供并排查看方式。", ["slider", "pan-and-zoom", "image-gallery"], "slider",
  ),
];

export const catalog: readonly CatalogItem[] = catalogSeeds.map((item, index) => ({
  slug: item.slug,
  order: index + 1,
  category: item.category,
  platforms: item.platforms,
  name: item.name,
  summary: item.summary,
  aliases: item.aliases,
  keywords: item.keywords,
  anatomy: item.anatomy,
  useWhen: item.useWhen,
  avoidWhen: item.avoidWhen,
  accessibility: item.accessibility,
  related: item.related,
  aiPrompt: `实现${item.name.zh}（${item.name.en}）：${item.summary.zh}`,
  code: makeCode(item),
}));

const catalogBySlug = new Map(catalog.map((item) => [item.slug, item]));

export function getCatalogItem(slug: string): CatalogItem | undefined {
  return catalogBySlug.get(slug);
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[\s\-_—–/\\|·、，。！？：；,.!?():（）\[\]{}]+/g, " ")
    .trim();
}

export interface CatalogFilters {
  readonly q?: string;
  readonly category?: CategoryId | "all" | "";
  readonly platform?: PlatformId | "all" | "";
}

function searchText(item: CatalogItem): string {
  const category = categories.find((candidate) => candidate.id === item.category);
  const platformLabels = platforms
    .filter((candidate) => item.platforms.includes(candidate.id))
    .flatMap((candidate) => [candidate.id, candidate.zh, candidate.en]);

  return normalizeSearchText([
    item.slug,
    item.name.zh,
    item.name.en,
    item.summary.zh,
    item.summary.en,
    ...item.aliases,
    ...item.keywords,
    ...item.anatomy,
    ...item.useWhen,
    ...item.avoidWhen,
    ...item.accessibility,
    category?.zh ?? "",
    category?.en ?? "",
    ...platformLabels,
  ].join(" "));
}

export function filterCatalog(filters?: CatalogFilters): CatalogItem[];
export function filterCatalog(
  items: readonly CatalogItem[],
  filters?: CatalogFilters,
): CatalogItem[];
export function filterCatalog(
  itemsOrFilters: readonly CatalogItem[] | CatalogFilters = catalog,
  maybeFilters: CatalogFilters = {},
): CatalogItem[] {
  const items = Array.isArray(itemsOrFilters) ? itemsOrFilters : catalog;
  const filters = (Array.isArray(itemsOrFilters) ? maybeFilters : itemsOrFilters) as CatalogFilters;
  const query = normalizeSearchText(filters.q ?? "");
  const terms = query.split(" ").filter(Boolean);

  return items
    .filter((item) => !filters.category || filters.category === "all" || item.category === filters.category)
    .filter((item) => !filters.platform || filters.platform === "all" || item.platforms.includes(filters.platform))
    .filter((item) => {
      if (!query) return true;
      const haystack = searchText(item);
      return haystack.includes(query) || terms.every((term) => haystack.includes(term));
    })
    .slice()
    .sort((a, b) => a.order - b.order);
}

export function validateCatalog(items: readonly CatalogItem[] = catalog): string[] {
  const errors: string[] = [];
  const slugs = new Set(items.map((item) => item.slug));

  if (items.length !== 75) errors.push(`目录应包含 75 个条目，当前为 ${items.length} 个。`);
  if (slugs.size !== items.length) errors.push("目录包含重复 slug。");

  for (const item of items) {
    if (!item.name.zh || !item.name.en || !item.summary.zh || !item.summary.en) {
      errors.push(`${item.slug}: 中英名称或说明不完整。`);
    }
    if (!item.anatomy.length || !item.useWhen.length || !item.accessibility.length) {
      errors.push(`${item.slug}: 使用说明不完整。`);
    }
    if (!item.code.vanilla.length || !item.code.react.length) {
      errors.push(`${item.slug}: 缺少原生或 React 代码包。`);
    }
    for (const file of [...item.code.vanilla, ...item.code.react]) {
      if (!file.name || !file.code.trim()) errors.push(`${item.slug}: 存在空代码文件。`);
    }
    for (const relatedSlug of item.related) {
      if (!slugs.has(relatedSlug)) errors.push(`${item.slug}: 关联条目 ${relatedSlug} 不存在。`);
    }
  }

  return errors;
}

const catalogErrors = validateCatalog();
if (catalogErrors.length) {
  throw new Error(`UI 目录校验失败：\n${catalogErrors.join("\n")}`);
}
