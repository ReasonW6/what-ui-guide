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
  "split-view",
  "button",
  "icon-button",
  "button-group",
  "split-button",
  "toolbar",
  "dropdown-menu",
  "context-menu",
  "overflow-menu",
  "command-palette",
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
  "focus-ring",
  "progress-ring",
  "dialog",
  "alert-dialog",
  "popover",
  "tooltip",
  "hover-card",
  "side-sheet",
  "accordion",
  "disclosure",
  "lightbox",
  "scrim",
  "card",
  "list-item",
  "avatar",
  "chip",
  "carousel",
  "image-gallery",
  "truncated-text",
  "divider",
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
  const initialActive = slug === "breadcrumb" ? "滑块" : slug === "anchor-navigation" ? "简介" : slug === "split-view" ? "收件箱" : labels[0];
  const [active, setActive] = useState(initialActive);
  const [globalActionStatus, setGlobalActionStatus] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(2);
  const [step, setStep] = useState(1);
  const [splitPosition, setSplitPosition] = useState(38);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const anchorContentRef = useRef<HTMLDivElement>(null);
  const drawerOpened = useRef(false);

  useEffect(() => {
    if (drawerOpen) {
      drawerOpened.current = true;
      drawerCloseRef.current?.focus();
    } else if (drawerOpened.current) {
      drawerTriggerRef.current?.focus();
      drawerOpened.current = false;
    }
  }, [drawerOpen]);

  const navButtons = (vertical = false) => (
    <div className={vertical ? "demo-nav-list is-vertical" : "demo-nav-list"}>
      {labels.map((label, index) => (
        <button
          aria-current={active === label ? "page" : undefined}
          className={active === label ? "is-active" : ""}
          key={label}
          onClick={() => {
            setActive(label);
            setGlobalActionStatus("");
          }}
          type="button"
        >
          <MiniIcon>{["⌂", "◇", "☷", "◎"][index]}</MiniIcon>
          {label}
        </button>
      ))}
    </div>
  );

  const updateSplitFromPointer = (handle: HTMLElement, clientX: number) => {
    const rect = handle.parentElement?.getBoundingClientRect();
    if (!rect?.width) return;
    setSplitPosition(Math.round(Math.max(28, Math.min(65, ((clientX - rect.left) / rect.width) * 100))));
  };

  const handleDrawerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!drawerOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setDrawerOpen(false);
      return;
    }
    if (event.key !== "Tab" || !drawerRef.current) return;

    const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
      "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
    ));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;

    const activeElement = document.activeElement;
    if (!activeElement || !drawerRef.current.contains(activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  switch (slug) {
    case "navigation-bar":
      return (
        <nav className="demo-navbar" aria-label="演示主导航">
          <strong><span className="demo-logo-dot" />设计笔记</strong>
          {navButtons()}
          <div className="demo-navbar-actions">
            <button aria-label="全局搜索" onClick={() => setGlobalActionStatus("已打开全局搜索")} type="button"><MiniIcon>⌕</MiniIcon></button>
            {density === "detail" && <button aria-label="账户菜单" onClick={() => setGlobalActionStatus("已打开账户菜单")} type="button"><span aria-hidden="true" className="demo-navbar-avatar">LX</span></button>}
          </div>
          <Status>{globalActionStatus || active}</Status>
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
        <div className="demo-drawer-scene" onKeyDown={handleDrawerKeyDown}>
          <button aria-controls="demo-navigation-drawer" aria-expanded={drawerOpen} className="demo-primary" onClick={() => setDrawerOpen(true)} ref={drawerTriggerRef} type="button">
            <MiniIcon>☰</MiniIcon>打开导航抽屉
          </button>
          {drawerOpen && <><button aria-label="关闭导航抽屉" className="demo-drawer-scrim" onClick={() => setDrawerOpen(false)} tabIndex={-1} type="button" /><div aria-labelledby="demo-navigation-drawer-title" aria-modal={density === "detail" ? true : undefined} className="demo-drawer is-open" id="demo-navigation-drawer" ref={drawerRef} role="dialog">
            <button aria-label="关闭导航抽屉" className="demo-close" onClick={() => setDrawerOpen(false)} ref={drawerCloseRef} type="button">×</button>
            <strong id="demo-navigation-drawer-title">浏览</strong>
            {navButtons(true)}
          </div></>}
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
            {labels.slice(0, 3).map((label, index, tabs) => (
              <button
                aria-controls="demo-tab-panel"
                aria-selected={active === label}
                className={active === label ? "is-active" : ""}
                id={`demo-tab-${index}`}
                key={label}
          onClick={() => {
            setActive(label);
            setGlobalActionStatus("");
          }}
                onKeyDown={(event) => {
                  const current = tabs.indexOf(label);
                  const next = event.key === "ArrowRight" ? (current + 1) % tabs.length
                    : event.key === "ArrowLeft" ? (current - 1 + tabs.length) % tabs.length
                      : event.key === "Home" ? 0
                        : event.key === "End" ? tabs.length - 1
                          : -1;
                  if (next >= 0) {
                    event.preventDefault();
                    setActive(tabs[next]);
                    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
                  }
                }}
                role="tab"
                tabIndex={active === label ? 0 : -1}
                type="button"
              >{label}</button>
            ))}
          </div>
          <div aria-labelledby={`demo-tab-${labels.slice(0, 3).indexOf(active)}`} className="demo-tab-panel" id="demo-tab-panel" role="tabpanel" tabIndex={0}><strong>{active}</strong><span>这里显示“{active}”内容。</span></div>
        </div>
      );
    case "breadcrumb":
      return (
        <nav className="demo-breadcrumb" aria-label="面包屑">
          {["首页", "设计系统", "滑块"].map((label, index) => (
            <span key={label}>
              {index > 0 && <i aria-hidden="true">›</i>}
              <a aria-current={active === label ? "page" : undefined} href={`#demo-breadcrumb-${index}`} onClick={(event) => { event.preventDefault(); setActive(label); }}>{label}</a>
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
          {density === "detail" && <button className="demo-primary" disabled={step === 2} onClick={() => setStep((value) => Math.min(2, value + 1))} type="button">{step === 2 ? "已完成" : "下一步"}</button>}
        </div>
      );
    }
    case "anchor-navigation": {
      const sections = [
        ["简介", "认识标准术语，快速描述想要的界面。"],
        ["结构", "拆解触发器、内容区与当前状态。"],
        ["用法", "选择目录，在当前容器内定位章节。"],
      ];
      return (
        <div className="demo-anchor-layout">
          <nav aria-label="页内目录">
            {sections.map(([label], index) => { const id = `demo-anchor-${density}-${index}`; return <a aria-current={active === label ? "location" : undefined} className={active === label ? "is-active" : ""} href={`#${id}`} key={label} onClick={(event) => { event.preventDefault(); const target = anchorContentRef.current?.querySelector<HTMLElement>(`#${id}`); if (!target || !anchorContentRef.current) return; setActive(label); anchorContentRef.current.scrollTo({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", top: target.offsetTop }); }}>{label}</a>; })}
          </nav>
          <div aria-label="章节内容" className="demo-anchor-content" onScroll={(event) => { const current = sections.reduce((selected, [label], index) => event.currentTarget.scrollTop + 12 >= (event.currentTarget.querySelector<HTMLElement>(`#demo-anchor-${density}-${index}`)?.offsetTop ?? Number.POSITIVE_INFINITY) ? label : selected, sections[0][0]); setActive(current); }} ref={anchorContentRef} tabIndex={0}>{sections.map(([label, copy], index) => <section id={`demo-anchor-${density}-${index}`} key={label}><small>章节 {index + 1}</small><strong>{label}</strong><p>{copy}</p></section>)}</div>
        </div>
      );
    }
    case "split-view": {
      const splitItems = ["收件箱", "草稿", "归档"].slice(0, density === "detail" ? 3 : 2);
      return (
        <div className="demo-split-view" style={{ gridTemplateColumns: `minmax(0, ${splitPosition}fr) 12px minmax(0, ${100 - splitPosition}fr)` }}>
          <nav aria-label="文件夹">
            <strong>邮件</strong>
            {splitItems.map((item) => <button aria-current={active === item ? "page" : undefined} className={active === item ? "is-active" : ""} key={item} onClick={() => setActive(item)} type="button">{item}</button>)}
          </nav>
          <div
            aria-label="调整左右面板宽度"
            aria-orientation="vertical"
            aria-valuemax={65}
            aria-valuemin={28}
            aria-valuenow={splitPosition}
            aria-valuetext={`左侧面板 ${splitPosition}%`}
            className="demo-split-divider"
            onDoubleClick={() => setSplitPosition(38)}
            onKeyDown={(event) => {
              const next = event.key === "ArrowLeft" ? splitPosition - 4
                : event.key === "ArrowRight" ? splitPosition + 4
                  : event.key === "Home" ? 28
                    : event.key === "End" ? 65
                      : null;
              if (next === null) return;
              event.preventDefault();
              setSplitPosition(Math.max(28, Math.min(65, next)));
            }}
            onPointerCancel={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
            onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); updateSplitFromPointer(event.currentTarget, event.clientX); }}
            onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updateSplitFromPointer(event.currentTarget, event.clientX); }}
            onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
            role="separator"
            tabIndex={0}
          />
          <section aria-live="polite">
            <small>当前文件夹</small>
            <strong>{splitItems.includes(active) ? active : splitItems[0]}</strong>
            <i /><i />
          </section>
        </div>
      );
    }
    default:
      return null;
  }
}

function ActionDemo({ slug, density }: DemoProps & { slug: DemoSlug }) {
  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState(slug === "split-button" ? "选择发布方式" : "左对齐");
  const [menuOpen, setMenuOpen] = useState(
    density === "card" && ["split-button", "dropdown-menu", "context-menu", "overflow-menu"].includes(slug),
  );
  const [favorite, setFavorite] = useState(false);
  const [toolbarFocus, setToolbarFocus] = useState(0);
  const [commandOpen, setCommandOpen] = useState(density === "card" && slug === "command-palette");
  const [commandQuery, setCommandQuery] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const menuHostRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuWasOpened = useRef(false);
  const commandTriggerRef = useRef<HTMLButtonElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const commandReturnFocus = useRef<HTMLElement | null>(null);
  const actions = ["复制链接", "移动到…", "加入收藏"];
  const menuActions = slug === "split-button" ? ["立即发布", "定时发布", "存为草稿"] : actions;
  const commands = ["新建词条", "搜索组件", "打开设置"];
  const matchingCommands = commands.filter((command) => command.includes(commandQuery.trim()));
  const visibleCommands = matchingCommands.slice(0, density === "detail" ? 3 : 2);

  useEffect(() => {
    if (menuOpen && menuWasOpened.current) {
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    } else if (menuWasOpened.current) {
      menuTriggerRef.current?.focus();
      menuWasOpened.current = false;
    }
  }, [menuOpen]);

  useEffect(() => {
    if (density !== "detail" || !menuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuHostRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [density, menuOpen]);

  useEffect(() => {
    if (slug !== "command-palette") return;
    if (commandOpen && commandReturnFocus.current) {
      commandInputRef.current?.focus();
    } else if (!commandOpen && commandReturnFocus.current) {
      if (commandReturnFocus.current.isConnected) commandReturnFocus.current.focus();
      commandReturnFocus.current = null;
    }
  }, [commandOpen, slug]);

  useEffect(() => {
    if (slug !== "command-palette" || density !== "detail") return;
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      if (commandOpen) {
        setCommandOpen(false);
        return;
      }
      commandReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : commandTriggerRef.current;
      setCommandQuery("");
      setCommandIndex(0);
      setCommandOpen(true);
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [commandOpen, density, slug]);

  const choose = (value: string) => {
    menuWasOpened.current = true;
    setSelected(value);
    if (slug === "split-button") setCount(0);
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    menuWasOpened.current = true;
    setMenuOpen((value) => !value);
  };

  const openMenu = () => {
    menuWasOpened.current = true;
    setMenuOpen(true);
  };

  const openCommandPalette = () => {
    commandReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : commandTriggerRef.current;
    setCommandQuery("");
    setCommandIndex(0);
    setCommandOpen(true);
  };

  const chooseCommand = (command: string) => {
    setSelected(command);
    setCommandOpen(false);
  };

  const handleCommandKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setCommandOpen(false);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      commandInputRef.current?.focus();
      return;
    }
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && visibleCommands.length) {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setCommandIndex((index) => (index + direction + visibleCommands.length) % visibleCommands.length);
      return;
    }
    if (event.key === "Enter" && visibleCommands[commandIndex]) {
      event.preventDefault();
      chooseCommand(visibleCommands[commandIndex]);
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab") {
      menuWasOpened.current = false;
      setMenuOpen(false);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      menuWasOpened.current = true;
      setMenuOpen(false);
      return;
    }
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    const current = Math.max(0, buttons.indexOf(document.activeElement as HTMLButtonElement));
    const next = event.key === "ArrowDown" ? (current + 1) % buttons.length
      : event.key === "ArrowUp" ? (current - 1 + buttons.length) % buttons.length
        : event.key === "Home" ? 0
          : event.key === "End" ? buttons.length - 1
            : -1;
    if (next >= 0) {
      event.preventDefault();
      buttons[next]?.focus();
    }
  };

  const popup = menuOpen && (
    <div aria-label={slug === "split-button" ? "发布选项" : "操作选项"} className="demo-menu" id={`demo-menu-${slug}`} onKeyDown={handleMenuKeyDown} ref={menuRef} role="menu">
      {menuActions.map((action) => <button key={action} onClick={() => choose(action)} role="menuitem" tabIndex={-1} type="button">{action}</button>)}
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
        <div className="demo-popup-wrap" ref={menuHostRef}>
          <div className="demo-split-button"><button onClick={() => setCount((value) => value + 1)} type="button">发布</button><button aria-controls={`demo-menu-${slug}`} aria-expanded={menuOpen} aria-haspopup="menu" aria-label="更多发布选项" onClick={toggleMenu} ref={menuTriggerRef} type="button">⌄</button></div>
          {popup}
          <Status>{count ? "已模拟发布" : selected}</Status>
        </div>
      );
    case "toolbar":
      return (
        <div className="demo-toolbar" role="toolbar" aria-label="文本格式">
          {["粗体", "斜体", "链接"].map((label, index) => <button aria-label={label} aria-pressed={selected === label} className={selected === label ? "is-active" : ""} key={label} onClick={() => { setSelected(label); setToolbarFocus(index); }} onKeyDown={(event) => {
            const total = density === "detail" ? 4 : 3;
            const next = event.key === "ArrowRight" ? (index + 1) % total
              : event.key === "ArrowLeft" ? (index - 1 + total) % total
                : event.key === "Home" ? 0
                  : event.key === "End" ? total - 1
                    : -1;
            if (next >= 0) {
              event.preventDefault();
              setToolbarFocus(next);
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
            }
          }} tabIndex={toolbarFocus === index ? 0 : -1} type="button">{["B", "I", "↗"][index]}</button>)}
          <span />
          {density === "detail" && <button aria-label="撤销" onClick={() => { setSelected("已撤销"); setToolbarFocus(3); }} onKeyDown={(event) => {
            const next = event.key === "ArrowRight" || event.key === "Home" ? 0
              : event.key === "ArrowLeft" ? 2
                : event.key === "End" ? 3
                  : -1;
            if (next >= 0) {
              event.preventDefault();
              setToolbarFocus(next);
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
            }
          }} tabIndex={toolbarFocus === 3 ? 0 : -1} type="button">↶</button>}
          <Status>{selected}</Status>
        </div>
      );
    case "dropdown-menu":
      return <div className="demo-popup-wrap" ref={menuHostRef}><button aria-controls={`demo-menu-${slug}`} aria-expanded={menuOpen} aria-haspopup="menu" className="demo-primary" onClick={toggleMenu} ref={menuTriggerRef} type="button">操作 <span>⌄</span></button>{popup}<Status>{selected}</Status></div>;
    case "context-menu":
      return (
        <div className="demo-popup-wrap demo-context-wrap" ref={menuHostRef}>
          <button
            aria-controls={`demo-menu-${slug}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="demo-context-target"
            onClick={openMenu}
            onContextMenu={(event) => { event.preventDefault(); openMenu(); }}
            ref={menuTriggerRef}
            type="button"
          >
            <span>文件：研究笔记.md</span><small>点击或右键打开菜单</small>
          </button>
          {popup}
          <Status>{selected}</Status>
        </div>
      );
    case "overflow-menu":
      return <div className="demo-popup-wrap" ref={menuHostRef}><div className="demo-record-row"><span className="demo-avatar-small">UI</span><span><strong>组件词典</strong><small>刚刚更新</small></span><button aria-controls={`demo-menu-${slug}`} aria-expanded={menuOpen} aria-haspopup="menu" aria-label="更多操作" className="demo-icon-button" onClick={toggleMenu} ref={menuTriggerRef} type="button">•••</button></div>{popup}</div>;
    case "command-palette":
      return <div className="demo-command-scene">{!(density === "card" && commandOpen) && <button aria-controls="demo-command-dialog" aria-expanded={commandOpen} aria-haspopup="dialog" className="demo-secondary" onClick={openCommandPalette} ref={commandTriggerRef} type="button">打开命令面板 <kbd>⌘K</kbd></button>}{commandOpen && <div className="demo-command-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}><div aria-labelledby="demo-command-title" aria-modal={density === "detail" ? true : undefined} className="demo-command-dialog" id="demo-command-dialog" onKeyDown={handleCommandKeyDown} role="dialog"><strong id="demo-command-title">快速操作</strong><label className="demo-command-input"><span className="sr-only">搜索命令</span><MiniIcon>⌕</MiniIcon><input aria-activedescendant={visibleCommands[commandIndex] ? `demo-command-${commandIndex}` : undefined} aria-autocomplete="list" aria-controls="demo-command-list" aria-expanded="true" onChange={(event) => { setCommandQuery(event.target.value); setCommandIndex(0); }} placeholder="输入命令…" ref={commandInputRef} role="combobox" value={commandQuery} /></label><div id="demo-command-list" role="listbox">{visibleCommands.length ? visibleCommands.map((command, index) => <button aria-selected={commandIndex === index} id={`demo-command-${index}`} key={command} onClick={() => chooseCommand(command)} onMouseEnter={() => setCommandIndex(index)} role="option" tabIndex={-1} type="button"><span aria-hidden="true">{["＋", "⌕", "⚙"][commands.indexOf(command)]}</span>{command}</button>) : <p>没有匹配命令</p>}</div>{density === "detail" && <small>↑↓ 导航 · Enter 执行 · Esc 关闭</small>}</div></div>} {!commandOpen && <Status>{selected === "左对齐" ? "⌘K 打开" : `已执行：${selected}`}</Status>}</div>;
    default:
      return null;
  }
}

function InputDemo({ slug, density }: DemoProps & { slug: DemoSlug }) {
  const [text, setText] = useState("");
  const [numberDraft, setNumberDraft] = useState("3");
  const [showPassword, setShowPassword] = useState(false);
  const [tags, setTags] = useState(["UI", "React"]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [maskedFocused, setMaskedFocused] = useState(false);
  const [otp, setOtp] = useState(["2", "", "", ""]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const suggestions = ["Slider 滑块", "Side sheet 侧边面板", "Skeleton 骨架屏"].filter((item) => item.toLowerCase().includes(text.toLowerCase()));
  const masked = text.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d{0,4})(\d{0,4})/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" "));
  const participantCount = Math.max(0, Math.min(20, Number(numberDraft) || 0));
  const canAddTag = Boolean(text.trim()) && !tags.some((tag) => tag.toLowerCase() === text.trim().toLowerCase());

  const addTag = () => {
    if (!canAddTag) return;
    setTags((items) => [...items, text.trim()]);
    setText("");
  };

  const handleLocalFile = (file?: File) => {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setFileName("");
      setFileError("仅支持 PNG 或 JPG 图片");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileName("");
      setFileError("文件不能超过 10 MB");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFileName(file.name);
    setFileError("");
  };

  const field = (options: { label: string; placeholder: string; type?: string }) => (
    <label className="demo-field"><span>{options.label}</span><input maxLength={40} onChange={(event) => setText(event.target.value)} placeholder={options.placeholder} type={options.type ?? "text"} value={text} />{density === "detail" && <small>{text.length}/40</small>}</label>
  );

  switch (slug) {
    case "text-field":
      return <div className="demo-form">{field({ label: "显示名称", placeholder: "例如：林间产品团队" })}<Status>{text ? `你好，${text}` : "请输入文本"}</Status></div>;
    case "textarea":
      return <label className="demo-field"><span>补充说明</span><textarea maxLength={160} onChange={(event) => setText(event.target.value)} placeholder="写下你的想法…" rows={density === "detail" ? 4 : 3} value={text} /><small>{text.length}/160</small></label>;
    case "password-field":
      return <div className="demo-form"><div className="demo-field"><label htmlFor="demo-password">密码</label><span className="demo-input-action"><input id="demo-password" onChange={(event) => setText(event.target.value)} placeholder="至少 8 位" type={showPassword ? "text" : "password"} value={text} /><button aria-label={showPassword ? "隐藏密码" : "显示密码"} onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? "隐藏" : "显示"}</button></span></div><div className="demo-strength"><i className={text.length > 2 ? "is-on" : ""} /><i className={text.length > 5 ? "is-on" : ""} /><i className={text.length > 7 ? "is-on" : ""} /></div></div>;
    case "search-field":
      return (
        <div className="demo-search-demo">
          <label className="demo-search-box"><MiniIcon>⌕</MiniIcon><span className="sr-only">搜索组件</span><input onChange={(event) => setText(event.target.value)} placeholder="搜索组件…" type="search" value={text} /></label>
          <div className="demo-suggestions">{(text ? suggestions : suggestions.slice(0, 2)).map((item) => <button key={item} onClick={() => setText(item.split(" ")[0])} type="button">{item}</button>)}</div>
        </div>
      );
    case "spinbutton":
      return <div className="demo-field"><label htmlFor="demo-participants">参会人数</label><span className="demo-spinbutton"><button aria-label="减少" disabled={participantCount === 0} onClick={() => setNumberDraft(String(Math.max(0, participantCount - 1)))} type="button">−</button><input id="demo-participants" max={20} min={0} onBlur={() => setNumberDraft(String(participantCount))} onChange={(event) => { const next = event.target.value.replace(/\D/g, ""); setNumberDraft(next === "" ? "" : String(Math.min(20, Number(next)))); }} type="number" value={numberDraft} /><button aria-label="增加" disabled={participantCount === 20} onClick={() => setNumberDraft(String(Math.min(20, participantCount + 1)))} type="button">＋</button></span><small>当前 {participantCount} 人</small></div>;
    case "masked-input":
      return <label className="demo-field"><span>手机号码</span><input inputMode="numeric" onBlur={() => setMaskedFocused(false)} onChange={(event) => setText(event.target.value.replace(/\D/g, "").slice(0, 11))} onFocus={() => setMaskedFocused(true)} placeholder="138 0000 0000" value={maskedFocused ? text : masked} /><small>{text.length === 11 ? "格式完整" : "失焦后自动分组"}</small></label>;
    case "otp-input":
      return (
        <fieldset className="demo-otp"><legend>输入 4 位验证码</legend><div>{otp.map((value, index) => <input aria-label={`第 ${index + 1} 位`} autoComplete={index === 0 ? "one-time-code" : "off"} inputMode="numeric" key={index} maxLength={1} onChange={(event) => { const digit = event.target.value.replace(/\D/g, "").slice(-1); setOtp((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item)); if (digit) otpRefs.current[index + 1]?.focus(); }} onKeyDown={(event) => { if (event.key === "Backspace" && !value && index > 0) otpRefs.current[index - 1]?.focus(); }} onPaste={(event) => { const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4 - index); if (!digits) return; event.preventDefault(); setOtp((current) => current.map((item, itemIndex) => itemIndex >= index && itemIndex < index + digits.length ? digits[itemIndex - index] : item)); otpRefs.current[Math.min(3, index + digits.length - 1)]?.focus(); }} ref={(node) => { otpRefs.current[index] = node; }} value={value} />)}</div><Status>{otp.every(Boolean) ? "验证码已填完整" : "依次填写数字"}</Status></fieldset>
      );
    case "tags-input":
      return (
        <div className="demo-form"><div className="demo-field"><label htmlFor="demo-tag-input">关键词</label><div className="demo-tags-box">{tags.map((tag, index) => <button aria-label={`移除 ${tag}`} key={tag} onClick={() => setTags((items) => items.filter((_, itemIndex) => itemIndex !== index))} type="button">{tag} ×</button>)}<input id="demo-tag-input" onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} placeholder="添加标签" value={text} /></div></div><button className="demo-secondary" disabled={!canAddTag} onClick={addTag} type="button">添加</button>{text.trim() && !canAddTag && <Status>该标签已存在</Status>}</div>
      );
    case "file-upload":
      return <div aria-describedby="demo-file-status" aria-label="图片拖放区" className={`demo-dropzone ${fileName ? "is-ready" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleLocalFile(event.dataTransfer.files[0]); }}><input accept="image/png,image/jpeg" hidden onChange={(event) => handleLocalFile(event.target.files?.[0])} ref={fileInputRef} type="file" /><MiniIcon>{fileName ? "✓" : "⇧"}</MiniIcon><strong>{fileName || "拖放文件到这里"}</strong><small className={fileError ? "is-error" : undefined} id="demo-file-status">{fileError || (fileName ? "仅作本地演示，未上传" : "PNG、JPG，最大 10 MB")}</small><button className="demo-secondary" onClick={() => { if (fileName || fileError) { setFileName(""); setFileError(""); if (fileInputRef.current) fileInputRef.current.value = ""; } else { fileInputRef.current?.click(); } }} type="button">{fileName || fileError ? "清除所选文件" : "选择文件"}</button></div>;
    default:
      return null;
  }
}

function SelectionDemo({ slug, density }: DemoProps & { slug: DemoSlug }) {
  const [checked, setChecked] = useState(true);
  const [choice, setChoice] = useState(slug === "segmented-control" ? "卡片" : "自动");
  const [value, setValue] = useState(62);
  const [secondValue, setSecondValue] = useState(84);
  const [color, setColor] = useState("#0a6cff");
  const [query, setQuery] = useState(density === "card" && slug === "combobox" ? "sl" : "");
  const [comboOpen, setComboOpen] = useState(density === "card" && slug === "combobox");
  const [comboIndex, setComboIndex] = useState(0);
  const options = ["自动", "Web", "Mobile"];
  const matches = ["Slider · 滑块", "Range slider · 范围滑块", "Switch · 开关"].filter((item) => item.toLowerCase().includes(query.toLowerCase()));

  const chooseComboOption = (item: string) => {
    setQuery(item);
    setComboOpen(false);
  };

  switch (slug) {
    case "checkbox":
      return <label className="demo-check"><input checked={checked} onChange={(event) => setChecked(event.target.checked)} type="checkbox" /><span>接收每周组件灵感</span><Status>{checked ? "已订阅" : "未订阅"}</Status></label>;
    case "radio-group":
      return <fieldset className="demo-radio"><legend>预览设备</legend>{options.map((item) => <label key={item}><input checked={choice === item} name="device" onChange={() => setChoice(item)} type="radio" /><span>{item}</span></label>)}<Status>{choice}</Status></fieldset>;
    case "switch":
      return <div className="demo-setting-row"><span><strong id="demo-switch-label">深色模式</strong><small>跟随你的阅读偏好</small></span><button aria-checked={checked} aria-labelledby="demo-switch-label" className={`demo-switch ${checked ? "is-on" : ""}`} onClick={() => setChecked((state) => !state)} role="switch" type="button"><span /></button></div>;
    case "select":
      return <label className="demo-field"><span>平台</span><select onChange={(event) => setChoice(event.target.value)} value={choice}>{options.map((item) => <option key={item}>{item}</option>)}</select><small>已选择：{choice}</small></label>;
    case "combobox":
      return (
        <div className="demo-combobox" onBlur={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setComboOpen(false); }}><label className="demo-field"><span>查找组件</span><input aria-activedescendant={comboOpen && matches[comboIndex] ? `combo-option-${comboIndex}` : undefined} aria-autocomplete="list" aria-controls="combo-list" aria-expanded={comboOpen} onChange={(event) => { setQuery(event.target.value); setComboIndex(0); setComboOpen(true); }} onFocus={() => { if (query) setComboOpen(true); }} onKeyDown={(event) => {
          if (event.key === "ArrowDown" && matches.length) {
            event.preventDefault();
            setComboOpen(true);
            setComboIndex((index) => (index + 1) % matches.length);
          } else if (event.key === "ArrowUp" && matches.length) {
            event.preventDefault();
            setComboOpen(true);
            setComboIndex((index) => (index - 1 + matches.length) % matches.length);
          } else if (event.key === "Enter" && comboOpen && matches[comboIndex]) {
            event.preventDefault();
            chooseComboOption(matches[comboIndex]);
          } else if (event.key === "Escape") {
            setComboOpen(false);
          }
        }} placeholder="输入 slider…" role="combobox" value={query} /></label>{comboOpen && query && <div id="combo-list" role="listbox">{matches.length ? matches.map((item, index) => <button aria-selected={comboIndex === index} id={`combo-option-${index}`} key={item} onClick={() => chooseComboOption(item)} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setComboIndex(index)} role="option" tabIndex={-1} type="button">{item}</button>) : <p>没有匹配组件</p>}</div>}</div>
      );
    case "segmented-control":
      return <div className="demo-centered"><div className="demo-segments" role="group" aria-label="视图模式">{["卡片", "列表", "紧凑"].map((item) => <button aria-pressed={choice === item} className={choice === item ? "is-active" : ""} key={item} onClick={() => setChoice(item)} type="button">{item}</button>)}</div><Status>{choice}视图</Status></div>;
    case "slider":
      return <label className="demo-range"><span><strong>音量</strong><output>{value}%</output></span><input max="100" min="0" onChange={(event) => setValue(Number(event.target.value))} type="range" value={value} />{density === "detail" && <div className="demo-range-scale"><span>静音</span><span>最大</span></div>}</label>;
    case "range-slider": {
      const low = Math.min(value, secondValue);
      const high = Math.max(value, secondValue);
      return <div className="demo-range"><span><strong>价格范围</strong><output>¥{low} – ¥{high}</output></span><div className="demo-dual-range" onPointerDown={(event) => { if (event.target !== event.currentTarget) return; const rect = event.currentTarget.getBoundingClientRect(); const next = Math.round(((event.clientX - rect.left) / rect.width) * 100); if (Math.abs(next - low) <= Math.abs(next - high)) setValue(Math.min(next, high)); else setSecondValue(Math.max(next, low)); }}><input aria-label="最低价格" max="100" min="0" onChange={(event) => setValue(Math.min(Number(event.target.value), secondValue))} type="range" value={low} /><input aria-label="最高价格" max="100" min="0" onChange={(event) => setSecondValue(Math.max(Number(event.target.value), value))} type="range" value={high} /></div></div>;
    }
    case "date-picker":
      return <label className="demo-field"><span>选择日期</span><input onChange={(event) => setChoice(event.target.value)} type="date" value={choice.match(/^\d/) ? choice : "2026-07-14"} /><small>{choice.match(/^\d/) ? choice : "2026-07-14"}</small></label>;
    case "color-picker":
      return <div className="demo-color-picker"><label><span className="sr-only">选择颜色</span><input onChange={(event) => setColor(event.target.value)} type="color" value={color} /></label><div><strong>{color.toUpperCase()}</strong><span className="demo-color-swatch" style={{ backgroundColor: color }} /></div>{density === "detail" && <div className="demo-color-presets">{["#0a6cff", "#af52de", "#28cd41", "#ff9500"].map((item) => <button aria-label={`使用颜色 ${item}`} key={item} onClick={() => setColor(item)} style={{ backgroundColor: item }} type="button" />)}</div>}</div>;
    default:
      return null;
  }
}

function FeedbackDemo({ slug, density }: DemoProps & { slug: DemoSlug }) {
  const [visible, setVisible] = useState(
    density === "card" || !["toast", "snackbar"].includes(slug),
  );
  const [progress, setProgress] = useState(42);
  const [text, setText] = useState("ui.example");
  const [count, setCount] = useState(3);
  const [focusTarget, setFocusTarget] = useState(0);
  const [toastHovered, setToastHovered] = useState(false);
  const [toastFocusWithin, setToastFocusWithin] = useState(false);
  const feedbackTriggerRef = useRef<HTMLButtonElement>(null);
  const restoreFeedbackFocus = useRef(false);
  const emptyActionRef = useRef<HTMLButtonElement>(null);
  const restoreEmptyFocus = useRef(false);

  useEffect(() => {
    if (!visible && restoreFeedbackFocus.current) {
      feedbackTriggerRef.current?.focus();
      restoreFeedbackFocus.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (restoreEmptyFocus.current) {
      emptyActionRef.current?.focus();
      restoreEmptyFocus.current = false;
    }
  }, [count]);

  useEffect(() => {
    if (slug !== "toast" || !visible || toastHovered || toastFocusWithin) return;
    const timeout = window.setTimeout(() => setVisible(false), 3600);
    return () => window.clearTimeout(timeout);
  }, [slug, toastFocusWithin, toastHovered, visible]);

  const dismissFeedback = () => {
    restoreFeedbackFocus.current = true;
    setToastHovered(false);
    setToastFocusWithin(false);
    setVisible(false);
  };

  const changeEmptyState = (nextCount: number) => {
    restoreEmptyFocus.current = true;
    setCount(nextCount);
  };

  const showButton = <button className="demo-primary" onClick={() => { setToastHovered(false); setToastFocusWithin(false); setVisible(true); }} ref={feedbackTriggerRef} type="button">显示提示</button>;

  switch (slug) {
    case "alert":
      return visible ? <div className="demo-alert" role="alert"><MiniIcon>i</MiniIcon><span><strong>新的组件已收录</strong><small>你可以在反馈与状态中找到它。</small></span><button aria-label="关闭提示" onClick={dismissFeedback} type="button">×</button></div> : <div className="demo-centered">{showButton}</div>;
    case "toast":
      return <div className="demo-notification-scene">{!visible && showButton}{visible && <div aria-atomic="true" className="demo-toast" onBlurCapture={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setToastFocusWithin(false); }} onFocusCapture={() => setToastFocusWithin(true)} onPointerEnter={() => setToastHovered(true)} onPointerLeave={() => setToastHovered(false)} role="status"><MiniIcon>✓</MiniIcon><span>链接已复制</span><button aria-label="关闭" onClick={dismissFeedback} type="button">×</button></div>}</div>;
    case "snackbar":
      return <div className="demo-notification-scene">{!visible && <button className="demo-secondary" onClick={() => setVisible(true)} ref={feedbackTriggerRef} type="button">归档项目</button>}{visible && <div className="demo-snackbar" role="status"><span>项目已归档</span><button onClick={dismissFeedback} type="button">撤销</button></div>}</div>;
    case "inline-validation": {
      const invalid = text.length > 0 && !text.includes(".");
      return <label className={`demo-field ${invalid ? "has-error" : ""}`}><span>个人网址</span><input aria-describedby="url-hint" aria-invalid={invalid} onChange={(event) => setText(event.target.value)} value={text} /><small id="url-hint">{invalid ? "请输入包含点号的域名" : "网址格式正确"}</small></label>;
    }
    case "progress-bar":
      return <div className="demo-progress-demo"><div><strong>正在导入组件</strong><output>{progress}%</output></div><progress max="100" value={progress}>{progress}%</progress><button className="demo-secondary" onClick={() => setProgress((value) => value >= 100 ? 0 : Math.min(100, value + 14))} type="button">推进进度</button></div>;
    case "spinner":
      return <div className="demo-centered"><button className="demo-primary" onClick={() => setVisible((value) => !value)} type="button">{visible ? "停止加载" : "开始加载"}</button>{visible && <span className="demo-spinner" role="status"><span className="sr-only">加载中</span></span>}</div>;
    case "skeleton-screen":
      return <div className="demo-skeleton-wrap"><button className="demo-secondary" onClick={() => setVisible((value) => !value)} type="button">{visible ? "显示内容" : "重新加载"}</button>{visible ? <div aria-busy="true" aria-label="内容加载中" aria-live="polite" className="demo-skeleton" role="status"><i aria-hidden="true" /><span aria-hidden="true"><i /><i /><i /></span></div> : <div className="demo-loaded-card"><span className="demo-avatar-small">UI</span><span><strong>滑块 Slider</strong><small>拖动圆点选择数值</small></span></div>}</div>;
    case "badge":
      return <div className="demo-centered"><button className="demo-bell" onClick={() => setCount((value) => (value + 1) % 10)} type="button"><span aria-hidden="true">♢</span><span className="demo-badge">{count}</span><span className="sr-only">通知，{count} 条</span></button><Status>点击增加通知</Status></div>;
    case "empty-state":
      return count ? <div className="demo-empty"><span aria-hidden="true">⌁</span><strong>还没有收藏</strong><small>收藏的组件会出现在这里。</small><button className="demo-primary" onClick={() => changeEmptyState(0)} ref={emptyActionRef} type="button">模拟收藏一个</button></div> : <div className="demo-loaded-card"><span className="demo-avatar-small">✓</span><span><strong>已收藏 Slider</strong><small>你的第一个收藏</small></span><button aria-label="清空收藏" onClick={() => changeEmptyState(1)} ref={emptyActionRef} type="button">×</button></div>;
    case "focus-ring": {
      const targets = ["主要操作", "次要操作", "文字链接"].slice(0, density === "detail" ? 3 : 2);
      return <div className="demo-focus-ring"><small>按 Tab 移动焦点，或点击预览</small><div aria-label="焦点环示例" role="group">{targets.map((target, index) => <button aria-pressed={focusTarget === index} className={focusTarget === index ? "is-focus-preview" : ""} key={target} onClick={() => setFocusTarget(index)} onFocus={() => setFocusTarget(index)} type="button">{target}</button>)}</div><Status>焦点：{targets[focusTarget] ?? targets[0]}</Status></div>;
    }
    case "progress-ring":
      return <div className="demo-progress-ring-wrap"><div aria-label="导入进度" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} aria-valuetext={`已完成 ${progress}%`} className="demo-progress-ring" role="progressbar"><svg aria-hidden="true" viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" /><circle cx="22" cy="22" pathLength="100" r="18" style={{ strokeDashoffset: 100 - progress }} /></svg><output>{progress}%</output></div><button className="demo-secondary" onClick={() => setProgress((value) => value >= 100 ? 0 : Math.min(100, value + 17))} type="button">推进进度</button></div>;
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
    "scrim",
  ].includes(slug);
  const [open, setOpen] = useState(previewOpen || slug === "accordion" || slug === "disclosure");
  const [openAccordionIndex, setOpenAccordionIndex] = useState<number | null>(0);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hoverTriggerRef = useRef<HTMLAnchorElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const safeActionRef = useRef<HTMLButtonElement>(null);
  const openedOnce = useRef(
    previewOpen && !["tooltip", "hover-card"].includes(slug),
  );
  const focusOnOpen = useRef(false);
  const isModal = ["dialog", "alert-dialog", "lightbox", "scrim", "side-sheet"].includes(slug);
  const lightboxItems = ["界面总览", "组件细节", "移动端预览"];

  useEffect(() => {
    if ((density === "detail" || focusOnOpen.current) && open && !["accordion", "disclosure", "tooltip", "hover-card"].includes(slug)) {
      openedOnce.current = true;
      focusOnOpen.current = false;
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]",
      );
      if (slug === "alert-dialog") {
        safeActionRef.current?.focus();
      } else if (isModal) {
        firstFocusable?.focus();
      } else {
        panelRef.current?.focus();
      }
    } else if (!open && openedOnce.current) {
      triggerRef.current?.focus();
      openedOnce.current = false;
    }
  }, [density, isModal, open, slug]);

  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (slug === "lightbox" && open && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      setLightboxIndex((index) => (index + direction + lightboxItems.length) % lightboxItems.length);
      return;
    }
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
      return;
    }

    if (event.key === "Tab" && open && isModal && panelRef.current) {
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])",
      ));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        event.preventDefault();
        panelRef.current.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };
  const toggleAccordionSection = (index: number) => {
    setOpenAccordionIndex((current) => current === index ? null : index);
  };
  const openOverlay = () => {
    openedOnce.current = true;
    focusOnOpen.current = true;
    setOpen(true);
  };
  const trigger = (label = "打开演示") => density === "card" && open
    ? null
    : <button aria-expanded={open} className="demo-primary" onClick={openOverlay} ref={triggerRef} type="button">{label}</button>;

  switch (slug) {
    case "scrim":
      return <div className="demo-overlay-scene" onKeyDown={handleOverlayKeyDown}>{trigger("显示遮罩")}{open && <div className="demo-scrim-layer" onPointerDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><div aria-describedby="scrim-copy" aria-labelledby="scrim-title" aria-modal={density === "detail" ? true : undefined} className="demo-scrim-card" ref={panelRef} role="dialog" tabIndex={-1}><strong id="scrim-title">继续编辑？</strong><small id="scrim-copy">遮罩弱化后方内容并聚焦当前任务。</small><button className="demo-primary" onClick={() => setOpen(false)} type="button">继续</button></div></div>}</div>;
    case "dialog":
      return <div className="demo-overlay-scene" onKeyDown={handleOverlayKeyDown}>{trigger("编辑资料")}{open && <div className="demo-backdrop"><div aria-labelledby="dialog-title" aria-modal={density === "detail" ? true : undefined} className="demo-dialog" ref={panelRef} role="dialog" tabIndex={-1}><strong id="dialog-title">编辑资料</strong><label className="demo-field"><span>显示名称</span><input defaultValue="林间团队" /></label><div className="demo-dialog-actions"><button onClick={() => setOpen(false)} type="button">取消</button><button className="demo-primary" onClick={() => setOpen(false)} type="button">保存</button></div></div></div>}</div>;
    case "alert-dialog":
      return <div className="demo-overlay-scene" onKeyDown={handleOverlayKeyDown}>{trigger("移除项目")}{open && <div className="demo-backdrop"><div aria-describedby="alert-copy" aria-labelledby="alert-title" aria-modal={density === "detail" ? true : undefined} className="demo-dialog is-alert" ref={panelRef} role="alertdialog" tabIndex={-1}><span className="demo-warning">!</span><strong id="alert-title">移除这个项目？</strong><small id="alert-copy">这是模拟操作，不会删除任何内容。</small><div className="demo-dialog-actions"><button onClick={() => setOpen(false)} ref={safeActionRef} type="button">取消</button><button className="demo-danger" onClick={() => setOpen(false)} type="button">确认移除</button></div></div></div>}</div>;
    case "popover":
      return <div className="demo-overlay-scene demo-popup-wrap" onKeyDown={handleOverlayKeyDown}>{trigger("查看详情")}{open && <div aria-labelledby="popover-title" className="demo-popover" ref={panelRef} role="dialog" tabIndex={-1}><strong id="popover-title">Slider · 滑块</strong><p>沿轨道拖动圆点，选择一个数值。</p><button onClick={() => setOpen(false)} type="button">知道了</button></div>}</div>;
    case "tooltip":
      return <div className="demo-overlay-scene"><div className="demo-hover-region" onBlur={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onFocus={() => setOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); triggerRef.current?.focus(); } }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}><button aria-describedby={open ? "tooltip-content" : undefined} aria-label="查看术语解释" className="demo-icon-button" onClick={() => setOpen((value) => !value)} ref={triggerRef} type="button">?</button>{open && <div className="demo-tooltip" id="tooltip-content" role="tooltip">查看术语解释</div>}</div></div>;
    case "hover-card":
      return <div className="demo-overlay-scene"><div className="demo-hover-region" onBlur={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onFocus={() => setOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); hoverTriggerRef.current?.focus(); } }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}><a aria-describedby={open ? "hover-card-content" : undefined} className="demo-text-link" href="#design-system-profile" onClick={(event) => { event.preventDefault(); setOpen((value) => !value); }} ref={hoverTriggerRef}>@design-system</a>{open && <div className="demo-hover-card" id="hover-card-content"><span className="demo-avatar-small">DS</span><span><strong>Design System</strong><small>收录 81 个常用组件</small></span></div>}</div></div>;
    case "side-sheet":
      return <div className="demo-overlay-scene" onKeyDown={handleOverlayKeyDown}>{trigger("打开设置")}{open && <div className="demo-side-sheet-layer" onPointerDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><div aria-labelledby="sheet-title" aria-modal={density === "detail" ? true : undefined} className="demo-side-sheet" ref={panelRef} role="dialog" tabIndex={-1}><div><strong id="sheet-title">页面设置</strong><button aria-label="关闭" onClick={() => setOpen(false)} type="button">×</button></div><label className="demo-check"><input defaultChecked type="checkbox" />显示网格</label><label className="demo-check"><input type="checkbox" />紧凑模式</label>{density === "detail" && <button className="demo-primary" onClick={() => setOpen(false)} type="button">应用</button>}</div></div>}</div>;
    case "accordion":
      return <div className="demo-accordion">{[["什么是 Slider？", "一种让用户在连续范围内选择数值的输入控件。"], ["何时使用？", "适合有明确上下界、强调相对值的场景。"], ["键盘如何操作？", "聚焦滑块后，使用方向键逐步调整数值。"]].map(([label, copy], index) => { const expanded = openAccordionIndex === index; const triggerId = `accordion-trigger-${density}-${index}`; const panelId = `accordion-panel-${density}-${index}`; return <div key={label}><h3><button aria-controls={panelId} aria-expanded={expanded} id={triggerId} onClick={() => toggleAccordionSection(index)} type="button"><span>{label}</span><span aria-hidden="true">{expanded ? "−" : "+"}</span></button></h3>{expanded && <div aria-labelledby={triggerId} className="demo-accordion-panel" id={panelId} role="region">{copy}</div>}</div>; })}</div>;
    case "disclosure":
      return <div className="demo-disclosure"><button aria-expanded={open} onClick={() => setOpen((value) => !value)} type="button"><span className={`demo-chevron ${open ? "is-open" : ""}`}>›</span><strong>显示高级选项</strong></button>{open && <div><label className="demo-check"><input defaultChecked type="checkbox" />启用键盘步进</label>{density === "detail" && <label className="demo-field"><span>步长</span><input defaultValue="5" type="number" /></label>}</div>}</div>;
    case "lightbox":
      return <div className="demo-overlay-scene" onKeyDown={handleOverlayKeyDown}><button aria-label="打开三张组件预览" className="demo-photo-thumb" onClick={openOverlay} ref={triggerRef} type="button"><span>UI</span><small>3 张 · 点击放大</small></button>{open && <div aria-label="组件预览灯箱" aria-modal={density === "detail" ? true : undefined} className="demo-lightbox" ref={panelRef} role="dialog" tabIndex={-1}><button aria-label="关闭灯箱" className="demo-lightbox-close" onClick={() => setOpen(false)} type="button">×</button><button aria-label="上一张" className="demo-lightbox-nav is-previous" onClick={() => setLightboxIndex((index) => (index - 1 + lightboxItems.length) % lightboxItems.length)} type="button">‹</button><figure aria-atomic="true" aria-live="polite"><div className={`tone-${lightboxIndex}`}><span>{["UI", "02", "M"][lightboxIndex]}</span></div><figcaption><strong>{lightboxItems[lightboxIndex]}</strong><span>{lightboxIndex + 1} / {lightboxItems.length}</span></figcaption></figure><button aria-label="下一张" className="demo-lightbox-nav is-next" onClick={() => setLightboxIndex((index) => (index + 1) % lightboxItems.length)} type="button">›</button></div>}</div>;
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
      return <ul className="demo-list">{["Slider", "Dialog", "Toast"].slice(0, density === "detail" ? 3 : 2).map((item, index) => <li key={item}><button className={active === index ? "is-active" : ""} onClick={() => setActive(index)} type="button"><span className="demo-avatar-small">{item.slice(0, 1)}</span><span><strong>{item}</strong><small>{["连续数值输入", "聚焦式浮层", "短暂状态反馈"][index]}</small></span><span>›</span></button></li>)}</ul>;
    case "avatar":
      return <div className="demo-centered"><button aria-label="切换在线状态" className={`demo-avatar-large ${favorite ? "is-away" : ""}`} onClick={() => setFavorite((value) => !value)} type="button">LX<span /></button><strong>林小夏</strong><Status>{favorite ? "离开" : "在线"}</Status></div>;
    case "chip":
      return <div className="demo-centered"><button aria-pressed={favorite} className={`demo-chip ${favorite ? "is-active" : ""}`} onClick={() => setFavorite((value) => !value)} type="button"><span>●</span>无障碍{favorite ? " ✓" : ""}</button><Status>{favorite ? "筛选已启用" : "点击筛选"}</Status></div>;
    case "carousel":
      return <div aria-label="常用组件" aria-roledescription="轮播" className="demo-carousel" role="region"><div aria-atomic="true" aria-live="polite" className={`demo-slide tone-${active}`}><small>组件 {active + 1} / {slides.length}</small><strong>{slides[active]}</strong></div><button aria-label="上一张" onClick={() => setActive((value) => (value - 1 + slides.length) % slides.length)} type="button">‹</button><button aria-label="下一张" onClick={() => setActive((value) => (value + 1) % slides.length)} type="button">›</button><div className="demo-dots">{slides.map((item, index) => <button aria-current={active === index ? "true" : undefined} aria-label={`查看 ${item}`} className={active === index ? "is-active" : ""} key={item} onClick={() => setActive(index)} type="button" />)}</div></div>;
    case "image-gallery":
      return <div className="demo-gallery"><div className={`demo-gallery-main tone-${active}`}><span>{["A", "B", "C"][active]}</span></div><div>{[0, 1, 2].map((item) => <button aria-label={`查看图片 ${item + 1}`} aria-pressed={active === item} className={`tone-${item} ${active === item ? "is-active" : ""}`} key={item} onClick={() => setActive(item)} type="button"><span>{["A", "B", "C"][item]}</span></button>)}</div></div>;
    case "truncated-text":
      return <div className="demo-truncated"><p className={expanded ? "is-expanded" : ""} id="truncated-copy">设计系统中的组件名称常常因平台而异。理解标准术语，可以更准确地检索文档、描述需求，也能让 AI 更快理解你想实现的交互效果。</p><button aria-controls="truncated-copy" aria-expanded={expanded} className="demo-text-link" onClick={() => setExpanded((value) => !value)} type="button">{expanded ? "收起" : "显示更多"}</button></div>;
    case "divider": {
      const vertical = active === 1;
      return <div className="demo-divider-wrap"><div className={`demo-divider-example ${vertical ? "is-vertical" : ""}`}><span><strong>{density === "detail" ? "主要内容" : "内容 A"}</strong><small>上一个区域</small></span><div aria-label="内容分隔线" aria-orientation={vertical ? "vertical" : "horizontal"} className="demo-divider-rule" role="separator" /><span><strong>{density === "detail" ? "补充内容" : "内容 B"}</strong><small>下一个区域</small></span></div><button aria-pressed={vertical} className="demo-secondary" onClick={() => setActive((value) => value === 1 ? 0 : 1)} type="button">切换为{vertical ? "水平" : "垂直"}分隔线</button></div>;
    }
    default:
      return null;
  }
}

function DataDemo({ slug, density }: DemoProps & { slug: DemoSlug }) {
  const [active, setActive] = useState(() => slug === "data-grid" ? 3 : 1);
  const [ascending, setAscending] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [selectedDay, setSelectedDay] = useState(14);
  const [monthOffset, setMonthOffset] = useState(0);
  const values = ascending ? [28, 54, 76] : [76, 54, 28];
  const rows = [
    ["Slider", "输入", "Web"],
    ["Dialog", "浮层", "通用"],
    ["Toast", "反馈", "Web"],
  ];
  const sortedRows = [...rows].sort((left, right) => {
    const result = left[0].localeCompare(right[0], "en");
    return ascending ? result : -result;
  });
  const absoluteMonth = 6 + monthOffset;
  const calendarYear = 2026 + Math.floor(absoluteMonth / 12);
  const calendarMonth = ((absoluteMonth % 12) + 12) % 12 + 1;
  const calendarEvents: Record<number, string> = { 10: "设计评审", 14: "发布检查", 18: "团队同步" };

  const handleGridKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const position = index - 3;
    const row = Math.floor(position / 3);
    const column = position % 3;
    const nextRow = event.key === "ArrowUp" ? Math.max(0, row - 1)
      : event.key === "ArrowDown" ? Math.min(1, row + 1)
        : row;
    const nextColumn = event.key === "ArrowLeft" ? Math.max(0, column - 1)
      : event.key === "ArrowRight" ? Math.min(2, column + 1)
        : event.key === "Home" ? 0
          : event.key === "End" ? 2
            : column;
    const next = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)
      ? 3 + nextRow * 3 + nextColumn
      : undefined;
    if (next === undefined) return;
    event.preventDefault();
    if (next === index) return;
    setActive(next);
    event.currentTarget.closest(".demo-data-grid")?.querySelector<HTMLButtonElement>(`[data-grid-index="${next}"]`)?.focus();
  };

  const handleTreeKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const tree = event.currentTarget.closest(".demo-tree");
    const focusItem = (next: number) => requestAnimationFrame(() => {
      tree?.querySelectorAll<HTMLButtonElement>("[role=treeitem]")[next]?.focus();
    });
    if (event.key === "ArrowRight" && index === 0 && !expanded) {
      event.preventDefault();
      setExpanded(true);
    } else if (event.key === "ArrowRight" && index === 0) {
      event.preventDefault();
      setActive(1);
      focusItem(1);
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      setActive(0);
      focusItem(0);
    } else if (event.key === "ArrowLeft" && index === 0 && expanded) {
      event.preventDefault();
      setExpanded(false);
    } else if (event.key === "ArrowDown" && expanded && index < 2) {
      event.preventDefault();
      setActive(index + 1);
      focusItem(index + 1);
    } else if (event.key === "ArrowUp" && index > 0) {
      event.preventDefault();
      setActive(index - 1);
      focusItem(index - 1);
    }
  };

  const handleCalendarKeyDown = (event: KeyboardEvent<HTMLButtonElement>, day: number) => {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const offset = offsets[event.key];
    if (offset === undefined) return;
    event.preventDefault();
    const next = day + offset;
    if (next < 7 || next > 20) return;
    setSelectedDay(next);
    event.currentTarget.closest(".demo-calendar-grid")?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus();
  };

  switch (slug) {
    case "data-table":
      return <div aria-label="可横向滚动的组件数据表" className="demo-table-scroll" tabIndex={0}><table><caption className="sr-only">组件数据表</caption><thead><tr><th aria-sort={ascending ? "ascending" : "descending"}><button onClick={() => setAscending((value) => !value)} type="button">组件 {ascending ? "↑" : "↓"}</button></th><th>类型</th><th>平台</th></tr></thead><tbody>{sortedRows.slice(0, density === "detail" ? 3 : 2).map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div>;
    case "data-grid":
      return <div className="demo-data-grid" role="grid" aria-label="组件数据"><div className="demo-data-grid-row" role="row">{["名称", "评分", "状态"].map((cell) => <div className="is-heading" key={cell} role="columnheader">{cell}</div>)}</div>{[["Slider", "9.4", "推荐"], ["Dialog", "9.1", "常用"]].map((row, rowIndex) => <div className="demo-data-grid-row" key={row[0]} role="row">{row.map((cell, columnIndex) => { const index = 3 + rowIndex * 3 + columnIndex; return <button aria-selected={active === index} className={active === index ? "is-active" : ""} data-grid-index={index} key={`${cell}-${index}`} onClick={() => setActive(index)} onKeyDown={(event) => handleGridKeyDown(event, index)} role="gridcell" tabIndex={active === index ? 0 : -1} type="button">{cell}</button>; })}</div>)}</div>;
    case "tree-view":
      return <div aria-label="组件分类" className="demo-tree" role="tree"><button aria-expanded={expanded} aria-selected={active === 0} onClick={() => { setActive(0); setExpanded((value) => !value); }} onKeyDown={(event) => handleTreeKeyDown(event, 0)} role="treeitem" tabIndex={active === 0 ? 0 : -1} type="button"><span>{expanded ? "⌄" : "›"}</span>组件</button>{expanded && <div role="group"><button aria-selected={active === 1} className={active === 1 ? "is-active" : ""} onClick={() => setActive(1)} onKeyDown={(event) => handleTreeKeyDown(event, 1)} role="treeitem" tabIndex={active === 1 ? 0 : -1} type="button">选择与取值</button><button aria-selected={active === 2} className={active === 2 ? "is-active" : ""} onClick={() => setActive(2)} onKeyDown={(event) => handleTreeKeyDown(event, 2)} role="treeitem" tabIndex={active === 2 ? 0 : -1} type="button">反馈与状态</button></div>}</div>;
    case "timeline":
      return <div className="demo-timeline">{["创建词条", "补充演示", "发布上线"].map((item, index) => <button aria-current={index === active ? "step" : undefined} className={index <= active ? "is-active" : ""} key={item} onClick={() => setActive(index)} type="button"><span>{index < active ? "✓" : index + 1}</span><span><strong>{item}</strong><small>{["09:20", "10:45", "待完成"][index]}</small></span></button>)}</div>;
    case "calendar-view": {
      const days = Array.from({ length: 14 }, (_, index) => index + 7);
      return <div className="demo-calendar"><div><button aria-label="上个月" onClick={() => setMonthOffset((value) => value - 1)} type="button">‹</button><strong>{calendarYear} 年 {calendarMonth} 月</strong><button aria-label="下个月" onClick={() => setMonthOffset((value) => value + 1)} type="button">›</button></div><div aria-label={`${calendarYear} 年 ${calendarMonth} 月日期`} className="demo-calendar-grid" role="grid">{[days.slice(0, 7), days.slice(7)].map((week, weekIndex) => <div className="demo-calendar-row" key={weekIndex} role="row">{week.map((day) => { const eventName = calendarEvents[day]; return <button aria-label={`${calendarMonth} 月 ${day} 日${eventName ? `，${eventName}` : "，无日程"}`} aria-selected={selectedDay === day} className={`${selectedDay === day ? "is-active" : ""} ${eventName ? "has-event" : ""}`} data-day={day} key={day} onClick={() => setSelectedDay(day)} onKeyDown={(event) => handleCalendarKeyDown(event, day)} role="gridcell" tabIndex={selectedDay === day ? 0 : -1} type="button">{day}{eventName && <span aria-hidden="true" className="demo-calendar-event-dot" />}</button>; })}</div>)}</div><Status>{calendarMonth} 月 {selectedDay} 日 · {calendarEvents[selectedDay] ?? "无日程"}</Status></div>;
    }
    case "chart":
      return <div className="demo-chart"><div className="demo-chart-heading"><span><strong>组件浏览量</strong><small>本周</small></span><Status>{values[active] ?? values[1]}k</Status></div><div className="demo-bars" role="group" aria-label="组件浏览量柱状图">{values.map((value, index) => <button aria-label={`第 ${index + 1} 项，${value}k`} aria-pressed={active === index} className={active === index ? "is-active" : ""} key={value} onClick={() => setActive(index)} style={{ height: `${value}%` }} type="button"><span>{value}k</span></button>)}</div></div>;
    default:
      return null;
  }
}

function MotionDemo({ slug }: DemoProps & { slug: DemoSlug }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [items, setItems] = useState(["Slider", "Dialog", "Toast"]);
  const [sortAnnouncement, setSortAnnouncement] = useState("");
  const [loaded, setLoaded] = useState(() => slug === "infinite-scroll" ? 3 : 2);
  const [zoom, setZoom] = useState(1);
  const [compare, setCompare] = useState(48);
  const snapRef = useRef<HTMLDivElement>(null);

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = Math.max(0, Math.min(items.length - 1, index + direction));
    if (nextIndex === index) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setActive(nextIndex);
    setSortAnnouncement(`${items[index]} 已移至第 ${nextIndex + 1} 项`);
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    setItems((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setActive(to);
    setSortAnnouncement(`${items[from]} 已移至第 ${to + 1} 项`);
  };

  const snapTo = (index: number) => {
    const next = Math.max(0, Math.min(2, index));
    setActive(next);
    const target = snapRef.current?.querySelector<HTMLElement>(`[data-snap-index="${next}"]`);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest", inline: "center" });
  };

  switch (slug) {
    case "drag-and-drop":
      return <div className="demo-sortable"><small>拖动，或用箭头排序</small>{items.map((item, index) => <div className={active === index ? "is-active" : ""} draggable key={item} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(index)); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); const from = Number(event.dataTransfer.getData("text/plain")); if (Number.isInteger(from)) reorder(from, index); }}><span aria-hidden="true">⠿</span><strong>{item}</strong><span><button aria-label={`上移 ${item}`} disabled={index === 0} onClick={() => move(index, -1)} type="button">↑</button><button aria-label={`下移 ${item}`} disabled={index === items.length - 1} onClick={() => move(index, 1)} type="button">↓</button></span></div>)}<span aria-atomic="true" aria-live="polite" className="sr-only">{sortAnnouncement}</span></div>;
    case "infinite-scroll":
      return <div className="demo-feed"><div aria-label="滚动加载内容" onScroll={(event) => { const target = event.currentTarget; if (target.scrollHeight - target.scrollTop - target.clientHeight < 18) setLoaded((value) => Math.min(4, value + 1)); }} tabIndex={0}>{Array.from({ length: loaded }, (_, index) => <article key={index}><span className="demo-avatar-small">{index + 1}</span><span><strong>{["Slider 设计要点", "Dialog 的焦点管理", "新增组件条目", "键盘操作清单"][index]}</strong><small>阅读 2 分钟</small></span></article>)}</div><button className="demo-secondary" disabled={loaded >= 4} onClick={() => setLoaded((value) => Math.min(4, value + 1))} type="button">{loaded >= 4 ? "已加载全部" : "继续加载"}</button><Status>已显示 {loaded} 条</Status></div>;
    case "lazy-loading":
      return <div className="demo-lazy"><div className={loaded > 2 ? "is-loaded" : ""}>{loaded > 2 ? <><span>UI</span><small>图片内容已显示</small></> : <><i /><i /><small>内容尚未进入视口</small></>}</div><button className="demo-primary" onClick={() => setLoaded((value) => value > 2 ? 2 : 3)} type="button">{loaded > 2 ? "卸载演示" : "模拟进入视口"}</button></div>;
    case "marquee":
      return <div className="demo-motion-control"><div className={`demo-marquee ${paused ? "is-paused" : ""}`}><div>{["Slider", "Dialog", "Toast", "Carousel", "Slider", "Dialog", "Toast", "Carousel"].map((item, index) => <span key={`${item}-${index}`}>{item} <i>◆</i></span>)}</div></div><button className="demo-secondary" onClick={() => setPaused((value) => !value)} type="button">{paused ? "继续滚动" : "暂停滚动"}</button></div>;
    case "parallax-scrolling":
      return <div className="demo-parallax"><div aria-label="可滚动的视差预览" className="demo-parallax-scroll" onScroll={(event) => { const maxScroll = event.currentTarget.scrollHeight - event.currentTarget.clientHeight; setActive(maxScroll > 0 ? Math.round((event.currentTarget.scrollTop / maxScroll) * 100) : 0); }} tabIndex={0}><div className="demo-parallax-scene"><span className="demo-orb orb-one" style={{ transform: `translateY(${active * -0.22}px)` }} /><span className="demo-orb orb-two" style={{ transform: `translateY(${active * 0.3}px)` }} /><strong style={{ transform: `translateY(${active * -0.08}px)` }}>层叠滚动</strong><small>滚动这里，观察图层速度差</small></div><div aria-hidden="true" className="demo-parallax-space"><span>SCROLL</span></div></div><Status>滚动位置 {active}%</Status></div>;
    case "scroll-snap":
      return <div className="demo-snap"><div aria-label="可吸附滚动的组件卡片" onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); snapTo(active + (event.key === "ArrowRight" ? 1 : -1)); } }} onScroll={(event) => { const container = event.currentTarget; const center = container.scrollLeft + container.clientWidth / 2; const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-snap-index]")); const closest = cards.reduce((best, card, index) => Math.abs(card.offsetLeft + card.offsetWidth / 2 - center) < best.distance ? { index, distance: Math.abs(card.offsetLeft + card.offsetWidth / 2 - center) } : best, { index: active, distance: Number.POSITIVE_INFINITY }); setActive(closest.index); }} ref={snapRef} tabIndex={0}>{["Slider", "Dialog", "Toast"].map((item, index) => <button className={`tone-${index} ${active === index ? "is-active" : ""}`} data-snap-index={index} key={item} onClick={() => snapTo(index)} type="button"><span>0{index + 1}</span><strong>{item}</strong></button>)}</div><div className="demo-dots">{[0, 1, 2].map((item) => <button aria-label={`跳到第 ${item + 1} 项`} className={active === item ? "is-active" : ""} key={item} onClick={() => snapTo(item)} type="button" />)}</div></div>;
    case "pan-and-zoom":
      return <div className="demo-panzoom"><div><span style={{ transform: `scale(${zoom}) translate(${active * 4}px, ${active * -2}px)` }}>UI</span></div><div role="group" aria-label="画布控制"><button aria-label="向左平移" disabled={active <= -5} onClick={() => setActive((value) => Math.max(-5, value - 1))} type="button">←</button><button aria-label="缩小" disabled={zoom <= 0.7} onClick={() => setZoom((value) => Math.max(0.7, value - 0.15))} type="button">−</button><output>{Math.round(zoom * 100)}%</output><button aria-label="放大" disabled={zoom >= 1.6} onClick={() => setZoom((value) => Math.min(1.6, value + 0.15))} type="button">＋</button><button aria-label="向右平移" disabled={active >= 5} onClick={() => setActive((value) => Math.min(5, value + 1))} type="button">→</button></div></div>;
    case "before-after-slider":
      return <div className="demo-before-after"><div className="demo-after"><span>AFTER</span></div><div className="demo-before" style={{ width: `${compare}%` }}><span>BEFORE</span></div><label className="demo-compare-control"><span className="sr-only">调整前后对比</span><input aria-valuetext={`前景显示 ${compare}%`} max="100" min="0" onChange={(event) => setCompare(Number(event.target.value))} type="range" value={compare} /></label><span aria-hidden="true" className="demo-compare-line" style={{ left: `${compare}%` }} /><span aria-hidden="true" className="demo-compare-handle" style={{ left: `${compare}%` }}>↔</span><output>{compare}%</output></div>;
    default:
      return null;
  }
}

const navigationSlugs = new Set<DemoSlug>([
  "navigation-bar", "sidebar-navigation", "navigation-drawer", "bottom-navigation", "tabs",
  "breadcrumb", "pagination", "progress-stepper", "anchor-navigation", "split-view",
]);
const actionSlugs = new Set<DemoSlug>([
  "button", "icon-button", "button-group", "split-button", "toolbar", "dropdown-menu",
  "context-menu", "overflow-menu", "command-palette",
]);
const inputSlugs = new Set<DemoSlug>([
  "text-field", "textarea", "password-field", "search-field", "spinbutton", "masked-input",
  "otp-input", "tags-input", "file-upload",
]);
const selectionSlugs = new Set<DemoSlug>([
  "checkbox", "radio-group", "switch", "select", "combobox", "segmented-control", "slider",
  "range-slider", "date-picker", "color-picker",
]);
const feedbackSlugs = new Set<DemoSlug>([
  "alert", "toast", "snackbar", "inline-validation", "progress-bar", "spinner",
  "skeleton-screen", "badge", "empty-state", "focus-ring", "progress-ring",
]);
const overlaySlugs = new Set<DemoSlug>([
  "dialog", "alert-dialog", "popover", "tooltip", "hover-card", "side-sheet", "accordion",
  "disclosure", "lightbox", "scrim",
]);
const contentSlugs = new Set<DemoSlug>([
  "card", "list-item", "avatar", "chip", "carousel", "image-gallery", "truncated-text", "divider",
]);
const dataSlugs = new Set<DemoSlug>([
  "data-table", "data-grid", "tree-view", "timeline", "calendar-view", "chart",
]);
const motionSlugs = new Set<DemoSlug>([
  "drag-and-drop", "infinite-scroll", "lazy-loading", "marquee", "parallax-scrolling",
  "scroll-snap", "pan-and-zoom", "before-after-slider",
]);

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
  "split-view": entry("split-view"),
  button: entry("button"),
  "icon-button": entry("icon-button"),
  "button-group": entry("button-group"),
  "split-button": entry("split-button"),
  toolbar: entry("toolbar"),
  "dropdown-menu": entry("dropdown-menu"),
  "context-menu": entry("context-menu"),
  "overflow-menu": entry("overflow-menu"),
  "command-palette": entry("command-palette"),
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
  "focus-ring": entry("focus-ring"),
  "progress-ring": entry("progress-ring"),
  dialog: entry("dialog"),
  "alert-dialog": entry("alert-dialog"),
  popover: entry("popover"),
  tooltip: entry("tooltip"),
  "hover-card": entry("hover-card"),
  "side-sheet": entry("side-sheet"),
  accordion: entry("accordion"),
  disclosure: entry("disclosure"),
  lightbox: entry("lightbox"),
  scrim: entry("scrim"),
  card: entry("card"),
  "list-item": entry("list-item"),
  avatar: entry("avatar"),
  chip: entry("chip"),
  carousel: entry("carousel"),
  "image-gallery": entry("image-gallery"),
  "truncated-text": entry("truncated-text"),
  divider: entry("divider"),
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
