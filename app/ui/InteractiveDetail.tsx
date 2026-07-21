"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  DEFAULT_DEMO_SETTINGS,
  getAnnotationGuides,
  getDemoControls,
  type DemoControl,
  type DemoSettings,
} from "./demo-config";
import { DemoStage } from "./DemoStage";
import "./interactive-detail.css";

type MarkerRect = {
  id: number;
  height: number;
  markerX: number;
  markerY: number;
  width: number;
  x: number;
  y: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function unionBounds(elements: readonly HTMLElement[]): DOMRect | null {
  const rects = elements.map((element) => element.getBoundingClientRect()).filter((rect) => rect.width && rect.height);
  if (!rects.length) return null;
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return new DOMRect(left, top, right - left, bottom - top);
}

function settingValueLabel(control: DemoControl, value: DemoSettings[keyof DemoSettings]): string {
  if (control.type === "toggle") return value ? "开启" : "关闭";
  if (control.type === "select") {
    return control.options.find((option) => String(option.value) === String(value))?.label ?? String(value);
  }
  return `${value}${control.type === "range" ? control.unit ?? "" : ""}`;
}

export function InteractiveDetail({
  anatomy,
  name,
  slug,
}: {
  anatomy: readonly string[];
  name: string;
  slug: string;
}) {
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("");
  const [panel, setPanel] = useState<"anatomy" | "customize">("anatomy");
  const [hoveredPart, setHoveredPart] = useState<number | null>(null);
  const [lockedPart, setLockedPart] = useState<number | null>(null);
  const [markers, setMarkers] = useState<MarkerRect[]>([]);
  const [settings, setSettings] = useState<DemoSettings>(() => ({ ...DEFAULT_DEMO_SETTINGS }));
  const [colorDrafts, setColorDrafts] = useState<Partial<Record<keyof DemoSettings, string>>>({});
  const shellRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const guides = useMemo(() => getAnnotationGuides(slug, anatomy), [anatomy, slug]);
  const controls = useMemo(() => getDemoControls(slug), [slug]);
  const activePart = hoveredPart ?? lockedPart;

  const applySetting = <Key extends keyof DemoSettings>(key: Key, value: DemoSettings[Key]) => {
    setSettings((current) => {
      const next = { ...current, [key]: value };
      if (key === "rangeLow") next.rangeLow = Math.min(Number(value), current.rangeHigh);
      if (key === "rangeHigh") next.rangeHigh = Math.max(Number(value), current.rangeLow);
      return next;
    });
  };

  const updateSettingFromDemo = <Key extends keyof DemoSettings>(key: Key, value: DemoSettings[Key]) => {
    setColorDrafts((current) => {
      if (current[key] === undefined) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    applySetting(key, value);
  };

  useEffect(() => {
    shellRef.current?.setAttribute("data-hydrated", "true");
  }, []);

  useLayoutEffect(() => {
    const preview = previewRef.current;
    const stage = preview?.querySelector<HTMLElement>(".demo-stage");
    if (!preview || !stage) return;

    let animationFrame = 0;
    let detachTargetListeners = () => {};

    const measure = () => {
      detachTargetListeners();
      const previewBounds = preview.getBoundingClientRect();
      const listenerCleanups: Array<() => void> = [];
      const nextMarkers: MarkerRect[] = [];

      guides.forEach((guide) => {
        const partTarget = stage.querySelector<HTMLElement>(`[data-demo-part="${guide.id}"]`);
        let targets = partTarget ? [partTarget] : [];
        if (!targets.length && guide.selector) {
          targets = Array.from(stage.querySelectorAll<HTMLElement>(guide.selector));
        }
        if (!targets.length) return;
        if (guide.targetMode !== "all" && guide.targetMode !== "union") targets = targets.slice(0, 1);

        const bounds = unionBounds(targets);
        if (!bounds) return;
        const rawX = bounds.left - previewBounds.left;
        const rawY = bounds.top - previewBounds.top;
        const x = clamp(rawX, 0, previewBounds.width);
        const y = clamp(rawY, 0, previewBounds.height);
        const width = Math.max(0, Math.min(previewBounds.width, rawX + bounds.width) - x);
        const height = Math.max(0, Math.min(previewBounds.height, rawY + bounds.height) - y);
        const markerSize = 26;
        const rightCandidate = x + width + 9;
        const leftCandidate = x - markerSize - 9;
        const markerX = guide.placement === "left"
          ? leftCandidate
          : guide.placement === "top"
            ? x + width / 2 - markerSize / 2
            : rightCandidate + markerSize <= previewBounds.width - 6
              ? rightCandidate
              : leftCandidate;
        const markerY = guide.placement === "top"
          ? y - markerSize - 9
          : y + Math.min(height / 2, 34) - markerSize / 2;

        nextMarkers.push({
          id: guide.id,
          height,
          markerX: clamp(markerX, 7, Math.max(7, previewBounds.width - markerSize - 7)),
          markerY: clamp(markerY, 7, Math.max(7, previewBounds.height - markerSize - 7)),
          width,
          x,
          y,
        });

        targets.forEach((target) => {
          const enter = () => setHoveredPart(guide.id);
          const leave = () => setHoveredPart((current) => current === guide.id ? null : current);
          target.addEventListener("pointerenter", enter);
          target.addEventListener("pointerleave", leave);
          target.addEventListener("focusin", enter);
          target.addEventListener("focusout", leave);
          listenerCleanups.push(() => {
            target.removeEventListener("pointerenter", enter);
            target.removeEventListener("pointerleave", leave);
            target.removeEventListener("focusin", enter);
            target.removeEventListener("focusout", leave);
          });
        });
      });

      detachTargetListeners = () => listenerCleanups.forEach((cleanup) => cleanup());
      setMarkers(nextMarkers);
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measure);
    };
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    const mutationObserver = new MutationObserver(scheduleMeasure);
    resizeObserver.observe(preview);
    resizeObserver.observe(stage);
    mutationObserver.observe(stage, {
      attributeFilter: ["aria-expanded", "aria-selected", "class", "hidden"],
      attributes: true,
      childList: true,
      subtree: true,
    });
    preview.addEventListener("scroll", scheduleMeasure, true);
    window.addEventListener("resize", scheduleMeasure);
    scheduleMeasure();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      detachTargetListeners();
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      preview.removeEventListener("scroll", scheduleMeasure, true);
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [guides, revision, settings]);

  const previewStyle = {
    "--demo-blue": settings.accent,
    "--demo-blue-bright": `color-mix(in srgb, ${settings.accent} 58%, white)`,
    "--demo-calendar-cell-size": `${settings.cellSize}px`,
    "--demo-control-size": `${settings.controlSize}px`,
    "--demo-marquee-duration": `${settings.marqueeDuration}ms`,
    "--demo-motion-fast": `${Math.max(80, Math.round(settings.motionMs * 0.72))}ms`,
    "--demo-motion-normal": `${settings.motionMs}ms`,
    "--demo-motion-slow": `${Math.round(settings.motionMs * 1.55)}ms`,
    "--demo-radius": `${settings.radius}px`,
  } as CSSProperties;

  const reset = () => {
    setRevision((value) => value + 1);
    setSettings({ ...DEFAULT_DEMO_SETTINGS });
    setColorDrafts({});
    setHoveredPart(null);
    setLockedPart(null);
    setStatus("演示与定制参数已重置");
  };

  return (
    <div className="detail-demo-shell detail-lab" ref={shellRef}>
      <div className="detail-demo-toolbar detail-lab-toolbar">
        <span className="detail-lab-label"><i aria-hidden="true" />LIVE · 本地交互实验室</span>
        <button type="button" onClick={reset}>重置 ↻</button>
      </div>

      <div
        className="detail-demo-canvas detail-demo-preview"
        data-backdrop={settings.backdrop}
        onKeyDown={(event) => {
          if (event.key === "Escape" && lockedPart !== null) {
            setLockedPart(null);
            setStatus("已取消部件高亮");
          }
        }}
        ref={previewRef}
        style={previewStyle}
      >
        <DemoStage
          density="detail"
          key={revision}
          onSettingChange={updateSettingFromDemo}
          settings={settings}
          slug={slug}
        />
        <div className="demo-annotation-overlay" aria-hidden="true">
          {markers.map((marker) => (
            <span
              className="demo-annotation-highlight"
              data-active={activePart === marker.id || undefined}
              key={`highlight-${marker.id}`}
              style={{
                height: marker.height,
                transform: `translate(${marker.x}px, ${marker.y}px)`,
                width: marker.width,
              }}
            />
          ))}
        </div>
        <div className="demo-annotation-markers">
          {markers.map((marker) => {
            const guide = guides.find((item) => item.id === marker.id);
            if (!guide) return null;
            return (
              <button
                aria-label={`部件 ${guide.id}：${guide.label}`}
                aria-pressed={lockedPart === guide.id}
                className="demo-annotation-marker"
                data-active={activePart === guide.id || undefined}
                key={`marker-${guide.id}`}
                onBlur={() => setHoveredPart((current) => current === guide.id ? null : current)}
                onClick={() => {
                  const next = lockedPart === guide.id ? null : guide.id;
                  setLockedPart(next);
                  setStatus(next ? `已锁定部件 ${guide.id}：${guide.label}` : "已取消部件高亮");
                }}
                onFocus={() => setHoveredPart(guide.id)}
                onMouseEnter={() => setHoveredPart(guide.id)}
                onMouseLeave={() => setHoveredPart((current) => current === guide.id ? null : current)}
                style={{ transform: `translate(${marker.markerX}px, ${marker.markerY}px)` }}
                type="button"
              >
                <span>{guide.id}</span>
                <em>{guide.label}</em>
              </button>
            );
          })}
        </div>
      </div>

      <div className="detail-demo-inspector">
        <div aria-label="演示辅助面板" className="detail-demo-tabs" role="tablist">
          <button
            aria-controls="demo-anatomy-panel"
            aria-selected={panel === "anatomy"}
            onClick={() => setPanel("anatomy")}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const nextPanel = event.key === "ArrowRight" || event.key === "End" ? "customize" : "anatomy";
              setPanel(nextPanel);
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role='tab']")[nextPanel === "anatomy" ? 0 : 1]?.focus();
            }}
            role="tab"
            tabIndex={panel === "anatomy" ? 0 : -1}
            type="button"
          >
            <span>01</span>拆解标注
          </button>
          <button
            aria-controls="demo-customize-panel"
            aria-selected={panel === "customize"}
            onClick={() => setPanel("customize")}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const nextPanel = event.key === "ArrowLeft" || event.key === "Home" ? "anatomy" : "customize";
              setPanel(nextPanel);
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role='tab']")[nextPanel === "anatomy" ? 0 : 1]?.focus();
            }}
            role="tab"
            tabIndex={panel === "customize" ? 0 : -1}
            type="button"
          >
            <span>02</span>自由定制
          </button>
        </div>

        {panel === "anatomy" ? (
          <div aria-label={`${name}组成部分`} className="demo-anatomy-list" id="demo-anatomy-panel" role="tabpanel">
            {guides.map((guide) => (
              <button
                aria-pressed={lockedPart === guide.id}
                data-active={activePart === guide.id || undefined}
                disabled={!markers.some((marker) => marker.id === guide.id)}
                key={guide.id}
                onBlur={() => setHoveredPart((current) => current === guide.id ? null : current)}
                onClick={() => setLockedPart((current) => current === guide.id ? null : guide.id)}
                onFocus={() => setHoveredPart(guide.id)}
                onMouseEnter={() => setHoveredPart(guide.id)}
                onMouseLeave={() => setHoveredPart((current) => current === guide.id ? null : current)}
                type="button"
              >
                <span>{guide.id}</span>
                <strong>{guide.label}</strong>
                <small>
                  {guide.description}
                  {!markers.some((marker) => marker.id === guide.id) && <em>当前示例未单独呈现这一部件。</em>}
                </small>
              </button>
            ))}
          </div>
        ) : (
          <div aria-label={`${name}定制参数`} className="demo-customize-grid" id="demo-customize-panel" role="tabpanel">
            {controls.map((control) => {
              const value = settings[control.key];
              return (
                <label className={`demo-control demo-control--${control.type}`} key={control.key}>
                  <span>
                    <strong>{control.label}</strong>
                    <output>{settingValueLabel(control, value)}</output>
                  </span>
                  {control.type === "color" && (
                    <span className="demo-color-control">
                      <input
                        aria-label={`${control.label}颜色`}
                        onChange={(event) => {
                          applySetting(control.key, event.target.value as never);
                          setColorDrafts((current) => ({ ...current, [control.key]: event.target.value }));
                        }}
                        type="color"
                        value={String(value)}
                      />
                      <input
                        aria-label={`${control.label}十六进制值`}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setColorDrafts((current) => ({ ...current, [control.key]: nextValue }));
                          if (/^#[0-9a-f]{6}$/i.test(nextValue)) applySetting(control.key, nextValue as never);
                        }}
                        onBlur={(event) => {
                          if (!/^#[0-9a-f]{6}$/i.test(event.target.value)) {
                            setColorDrafts((current) => ({ ...current, [control.key]: String(settings[control.key]) }));
                          }
                        }}
                        pattern="#[0-9a-fA-F]{6}"
                        type="text"
                        value={colorDrafts[control.key] ?? String(value)}
                      />
                    </span>
                  )}
                  {control.type === "range" && (
                    <input
                      aria-label={control.label}
                      max={control.max}
                      min={control.min}
                      onChange={(event) => applySetting(control.key, Number(event.target.value) as never)}
                      step={control.step}
                      type="range"
                      value={Number(value)}
                    />
                  )}
                  {control.type === "select" && (
                    <select
                      aria-label={control.label}
                      onChange={(event) => {
                        const option = control.options.find((item) => String(item.value) === event.target.value);
                        if (option) applySetting(control.key, option.value as never);
                      }}
                      value={String(value)}
                    >
                      {control.options.map((option) => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
                    </select>
                  )}
                  {control.type === "toggle" && (
                    <input
                      aria-label={control.label}
                      checked={Boolean(value)}
                      onChange={(event) => applySetting(control.key, event.target.checked as never)}
                      role="switch"
                      type="checkbox"
                    />
                  )}
                  {control.description && <small>{control.description}</small>}
                </label>
              );
            })}
          </div>
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">{status}</p>
    </div>
  );
}

export function CopyPrompt({ prompt }: { prompt: string }) {
  const [copyResult, setCopyResult] = useState<{
    message: string;
    state: "" | "success" | "error";
  }>({ message: "", state: "" });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyResult({ message: "提示词已复制", state: "success" });
    } catch {
      setCopyResult({ message: "复制失败，请手动选择文字", state: "error" });
    }
  };

  return (
    <>
      <div className="prompt-box">
        <code>{prompt}</code>
        <button
          aria-label="复制 AI 提示词"
          className="copy-icon-button"
          data-copied={copyResult.state === "success" || undefined}
          title="复制 AI 提示词"
          type="button"
          onClick={copy}
        >
          <span aria-hidden="true" className="copy-icon-button__glyph" />
        </button>
      </div>
      <p
        aria-atomic="true"
        className="copy-inline-status"
        data-state={copyResult.state || undefined}
        role={copyResult.state === "error" ? "alert" : "status"}
      >
        {copyResult.message || " "}
      </p>
    </>
  );
}
