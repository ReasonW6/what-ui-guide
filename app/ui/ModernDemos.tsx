"use client";

import { useEffect, useId, useRef, useState } from "react";
import "./modern-demos.css";

export function DateRangeDemo() {
  const id = useId();
  const [start, setStart] = useState("2026-09-05");
  const [end, setEnd] = useState("2026-09-12");
  const invalid = Boolean(start && end && end < start);
  return <div className="modern-demo">
    <div className="modern-kicker">报表时间范围</div>
    <div className="modern-date-row">
      <label>开始日期<input type="date" value={start} onChange={event => setStart(event.target.value)} /></label>
      <span aria-hidden="true">→</span>
      <label>结束日期<input type="date" value={end} min={start} aria-invalid={invalid} aria-describedby={`${id}-status`} onChange={event => setEnd(event.target.value)} /></label>
    </div>
    <div className="modern-actions">{[7, 30].map(days => <button key={days} type="button" disabled={!start} onClick={() => {
      const date = new Date(`${start}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + days - 1);
      setEnd(date.toISOString().slice(0, 10));
    }}>{days} 天</button>)}</div>
    <p id={`${id}-status`} role="status">{invalid ? "结束日期不能早于开始日期" : start && end ? `${start} — ${end}` : "请选择完整的日期范围"}</p>
  </div>;
}

export function TimeFieldDemo() {
  const [time, setTime] = useState("09:30");
  const id = useId();
  const valid = time >= "09:00" && time <= "18:00" && Number(time.split(":")[1]) % 15 === 0;
  return <div className="modern-demo">
    <label className="modern-kicker" htmlFor={id}>预约时间</label>
    <input id={id} type="time" min="09:00" max="18:00" step="900" value={time} aria-invalid={!valid} aria-describedby={`${id}-hint`} onChange={event => setTime(event.target.value)} />
    <div className="modern-actions">{["09:00", "09:15", "09:30"].map(value => <button type="button" key={value} aria-pressed={time === value} onClick={() => setTime(value)}>{value}</button>)}</div>
    <p id={`${id}-hint`} role="status">{valid ? `${time} · 上海时间 / UTC+8` : "请选择 09:00 至 18:00，每 15 分钟一个时段"}</p>
  </div>;
}

export function MultiSelectDemo() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(["设计"]);
  const options = ["设计", "研发", "产品", "研究"];
  const search = useRef<HTMLInputElement>(null);
  return <div className="modern-demo">
    <input ref={search} aria-label="搜索团队" placeholder="搜索团队…" type="search" value={query} onChange={event => setQuery(event.target.value)} />
    <fieldset className="modern-options"><legend>参与团队</legend>{options.filter(option => option.includes(query)).map(option => <label key={option}>
      <input type="checkbox" checked={selected.includes(option)} onChange={() => setSelected(current => current.includes(option) ? current.filter(value => value !== option) : [...current, option])} />{option}
    </label>)}{!options.some(option => option.includes(query)) && <p>没有匹配的团队</p>}</fieldset>
    <div className="modern-actions" aria-label="已选团队">{selected.map(option => <button type="button" key={option} aria-label={`移除${option}`} onClick={() => { setSelected(current => current.filter(value => value !== option)); search.current?.focus(); }}>{option} ×</button>)}</div>
    <p role="status">已选 {selected.length} 个团队</p>
  </div>;
}

export function RatingDemo() {
  const [rating, setRating] = useState(0);
  const [preview, setPreview] = useState(0);
  const id = useId();
  return <div className="modern-demo">
    <fieldset className="modern-rating" onMouseLeave={() => setPreview(0)}><legend>这次体验怎么样？</legend>
      <div>{[1, 2, 3, 4, 5].map(value => <label key={value} data-filled={value <= (preview || rating)} onMouseEnter={() => setPreview(value)}>
        <input type="radio" name={`${id}-rating`} aria-label={`${value} 星`} value={value} checked={rating === value} onChange={() => setRating(value)} /><span aria-hidden="true">★</span>
      </label>)}</div>
    </fieldset>
    <p role="status">{rating ? `${rating} / 5 · ${["", "有待改善", "还需打磨", "符合预期", "很满意", "非常喜欢"][rating]}` : "选择 1 至 5 星评分"}</p>
    <button type="button" onClick={() => { setRating(0); setPreview(0); }}>清除评分</button>
  </div>;
}

export function MenubarDemo() {
  const [open, setOpen] = useState(-1);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState("选择一个编辑命令");
  const root = useRef<HTMLDivElement>(null);
  const firstItem = useRef(0);
  const id = useId();
  const menus = [{ label: "文件", items: ["新建画板", "保存副本"] }, { label: "编辑", items: ["撤销操作", "复制图层"] }, { label: "视图", items: ["显示网格", "适合窗口"] }];
  const focusTop = (index: number) => {
    setActive(index);
    root.current?.querySelectorAll<HTMLButtonElement>("[data-menu-trigger]")[index]?.focus();
  };
  const focusItem = (index: number) => {
    const items = root.current?.querySelectorAll<HTMLButtonElement>("[data-menu-popup] [role=menuitem]");
    if (items?.length) items[(index + items.length) % items.length]?.focus();
  };
  useEffect(() => {
    if (open >= 0) {
      const items = root.current?.querySelectorAll<HTMLButtonElement>("[data-menu-popup] [role=menuitem]");
      if (items?.length) items[firstItem.current < 0 ? items.length - 1 : 0]?.focus();
      firstItem.current = 0;
    }
  }, [open]);
  return <div className="modern-demo" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(-1); }}>
    <div className="modern-menubar" role="menubar" aria-label="编辑器菜单">{menus.map((menu, index) => <div key={menu.label} role="none">
      <button id={`${id}-menu-${index}`} data-menu-trigger type="button" role="menuitem" aria-haspopup="menu" aria-expanded={open === index} aria-controls={open === index ? `${id}-popup-${index}` : undefined} tabIndex={active === index ? 0 : -1}
        onFocus={() => setActive(index)} onClick={() => setOpen(current => current === index ? -1 : index)} onKeyDown={event => {
          if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
            event.preventDefault(); focusTop(event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3);
          } else if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); if (open === index) focusItem(event.key === "ArrowUp" ? -1 : 0); else { firstItem.current = event.key === "ArrowUp" ? -1 : 0; setOpen(index); } }
        }}>{menu.label}</button>
      {open === index && <div id={`${id}-popup-${index}`} data-menu-popup role="menu" aria-labelledby={`${id}-menu-${index}`} onKeyDown={event => {
        const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=menuitem]")];
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        if (event.key === "Escape") { event.preventDefault(); setOpen(-1); focusTop(index); }
        else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); focusItem(event.key === "Home" ? 0 : event.key === "End" ? -1 : current + (event.key === "ArrowDown" ? 1 : -1)); }
        else if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); const next = (index + (event.key === "ArrowRight" ? 1 : 2)) % 3; setActive(next); setOpen(next); }
        else if (event.key === "Tab") { setOpen(-1); focusTop(index); }
        else if (event.key.length === 1) { const match = menu.items.findIndex(item => item.startsWith(event.key)); if (match >= 0) focusItem(match); }
      }}>{menu.items.map(item => <button type="button" role="menuitem" tabIndex={-1} key={item} onClick={() => { setStatus(`已执行：${item}`); setOpen(-1); focusTop(index); }}>{item}</button>)}</div>}
    </div>)}</div>
    <div className="modern-editor" aria-hidden="true">Aa<span>文稿 · 01</span></div>
    <p role="status">{status}</p>
  </div>;
}

export function QuestionnaireDemo() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(["", ""]);
  const heading = useRef<HTMLLegendElement>(null);
  const previousStep = useRef(0);
  const id = useId();
  const questions = [{ title: "你在设计什么？", options: ["网站", "移动应用", "桌面工具"] }, { title: "更关注哪一方面？", options: ["视觉设计", "交互行为", "代码实现"] }];
  const move = (next: number) => { setStep(next); };
  useEffect(() => { if (previousStep.current !== step) heading.current?.focus(); previousStep.current = step; }, [step]);
  return <div className="modern-demo">
    <div className="modern-kicker">{step < 2 ? `问题 ${step + 1} / 2` : "问卷完成"}</div>
    {step < 2 ? <fieldset className="modern-options"><legend tabIndex={-1} ref={heading}>{questions[step].title}</legend>{questions[step].options.map(option => <label key={option}>
      <input type="radio" name={`${id}-question-${step}`} checked={answers[step] === option} onChange={() => setAnswers(current => current.map((value, index) => index === step ? option : value))} />{option}
    </label>)}</fieldset> : <p role="status">你的选择：{answers.join(" · ")}</p>}
    <div className="modern-actions">
      {step > 0 && <button type="button" onClick={() => move(step - 1)}>上一步</button>}
      {step < 2 ? <button type="button" disabled={!answers[step]} onClick={() => move(step + 1)}>{step === 1 ? "完成问卷" : "下一步"}</button> : <button type="button" onClick={() => { setAnswers(["", ""]); move(0); }}>重新填写</button>}
    </div>
  </div>;
}

export function ChatMessageDemo() {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("侧边滑出的面板叫什么？");
  const [status, setStatus] = useState("");
  return <div className="modern-demo">
    <div className="modern-kicker">本地消息演示</div>
    <div className="modern-message"><small>你</small><p>{message}</p></div>
    <form className="modern-message-form" onSubmit={event => { event.preventDefault(); if (!text.trim()) return; setMessage(text.trim()); setText(""); setStatus("消息已发送到本地演示"); }}>
      <input aria-label="输入消息" maxLength={160} placeholder="输入一条消息…" value={text} onChange={event => setText(event.target.value)} /><button type="submit" disabled={!text.trim()}>发送</button>
    </form>
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(message); setStatus("已复制消息"); } catch { setStatus("无法复制，请手动选择消息文字"); } }}>复制消息</button>
    <p role="status">{status || "消息仅在当前演示中展示"}</p>
  </div>;
}

export function MessageScrollerDemo() {
  const [messages, setMessages] = useState(["开始整理组件目录", "确认输入与选择的区别", "补充键盘操作说明", "检查可复制代码", "欢迎继续讨论"]);
  const [unread, setUnread] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  useEffect(() => { if (following.current && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight; }, [messages]);
  return <div className="modern-demo">
    <div className="modern-transcript" ref={viewport} role="log" aria-label="示例消息记录" aria-relevant="additions" tabIndex={0} onScroll={() => {
      const element = viewport.current;
      if (element) { following.current = element.scrollHeight - element.scrollTop - element.clientHeight < 24; if (following.current) setUnread(0); }
    }}>{messages.map((message, index) => <p key={index}><small>讨论 {String(index + 1).padStart(2, "0")}</small>{message}</p>)}</div>
    <div className="modern-actions"><button type="button" disabled={messages.length >= 50} onClick={() => {
      setMessages(current => [...current, `新的组件笔记 ${current.length + 1}`]); if (!following.current) setUnread(current => current + 1);
    }}>添加消息</button>{unread > 0 && <button type="button" onClick={() => {
      following.current = true; if (viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight; setUnread(0);
    }}>查看新消息 ({unread}) ↓</button>}</div>
    <p role="status">{messages.length >= 50 ? "演示已达 50 条消息，可重置继续" : unread > 0 ? "已保留你正在阅读的位置" : "正在跟随最新消息"}</p>
  </div>;
}

export function AttachmentDemo() {
  const [removed, setRemoved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const restore = useRef<HTMLButtonElement>(null);
  const preview = useRef<HTMLButtonElement>(null);
  const changed = useRef(false);
  useEffect(() => { if (changed.current) (removed ? restore : preview).current?.focus(); }, [removed]);
  return <div className="modern-demo">
    <div className="modern-kicker">消息附件</div>
    {removed ? <p role="status">已移除组件笔记</p> : <article className="modern-attachment">
      <span className="modern-filetype" aria-hidden="true">TXT</span>
      <div><strong>组件笔记.txt</strong><small>纯文本 · 本地示例</small></div>
      <button type="button" aria-label="移除组件笔记.txt" onClick={() => { changed.current = true; setRemoved(true); setExpanded(false); }}>×</button>
    </article>}
    {!removed && <button ref={preview} type="button" aria-expanded={expanded} aria-controls={`${id}-preview`} onClick={() => setExpanded(current => !current)}>{expanded ? "收起预览" : "预览组件笔记"}</button>}
    <div id={`${id}-preview`} hidden={!expanded || removed}><p>附件展示文件名称与状态；文件上传负责选择和提交文件。</p></div>
    {removed && <button ref={restore} type="button" onClick={() => setRemoved(false)}>恢复附件</button>}
  </div>;
}

export const modernDemoRegistry = {
  "date-range-picker": DateRangeDemo,
  "time-field": TimeFieldDemo,
  "multi-select": MultiSelectDemo,
  rating: RatingDemo,
  menubar: MenubarDemo,
  questionnaire: QuestionnaireDemo,
  "chat-message": ChatMessageDemo,
  "message-scroller": MessageScrollerDemo,
  attachment: AttachmentDemo,
};
