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
  rail: "left" | "right" | "top";
  width: number;
  x: number;
  y: number;
};

const MARKER_SIZE = 26;
const MARKER_GAP = 12;
const MARKER_HIT_PADDING = 9;
const MARKER_EDGE_INSET = MARKER_HIT_PADDING + 3;
const MARKER_COLLISION_STEP = MARKER_SIZE + MARKER_HIT_PADDING * 2 + 4;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function resolveMarkerCollisions(
  markers: readonly MarkerRect[],
  previewWidth: number,
  previewHeight: number,
): MarkerRect[] {
  const resolved = markers.map((marker) => ({ ...marker }));
  (["left", "right", "top"] as const).forEach((rail) => {
    const axis: "markerX" | "markerY" = rail === "top" ? "markerX" : "markerY";
    const extent = rail === "top" ? previewWidth : previewHeight;
    const min = MARKER_EDGE_INSET;
    const max = Math.max(min, extent - MARKER_SIZE - MARKER_EDGE_INSET);
    const group = resolved
      .filter((marker) => marker.rail === rail)
      .sort((first, second) => first[axis] - second[axis]);
    if (!group.length) return;

    let cursor = min;
    group.forEach((marker) => {
      marker[axis] = Math.max(clamp(marker[axis], min, max), cursor);
      cursor = marker[axis] + MARKER_COLLISION_STEP;
    });

    const overflow = group[group.length - 1][axis] - max;
    if (overflow > 0) group.forEach((marker) => { marker[axis] -= overflow; });
    for (let index = group.length - 2; index >= 0; index -= 1) {
      group[index][axis] = Math.min(group[index][axis], group[index + 1][axis] - MARKER_COLLISION_STEP);
    }
    const underflow = min - group[0][axis];
    if (underflow > 0) group.forEach((marker) => { marker[axis] += underflow; });
  });
  return resolved;
}

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
  const [focusedPart, setFocusedPart] = useState<number | null>(null);
  const [markers, setMarkers] = useState<MarkerRect[]>([]);
  const [settings, setSettings] = useState<DemoSettings>(() => ({ ...DEFAULT_DEMO_SETTINGS }));
  const [colorDrafts, setColorDrafts] = useState<Partial<Record<keyof DemoSettings, string>>>({});
  const shellRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const keyboardInputRef = useRef(false);
  const guides = useMemo(() => getAnnotationGuides(slug, anatomy), [anatomy, slug]);
  const controls = useMemo(() => getDemoControls(slug), [slug]);
  const activePart = hoveredPart ?? focusedPart;

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

    const noteKeyboardInput = (event: KeyboardEvent) => {
      if (!event.altKey && !event.ctrlKey && !event.metaKey) keyboardInputRef.current = true;
    };
    const notePointerInput = () => { keyboardInputRef.current = false; };
    window.addEventListener("keydown", noteKeyboardInput, true);
    window.addEventListener("pointerdown", notePointerInput, true);
    return () => {
      window.removeEventListener("keydown", noteKeyboardInput, true);
      window.removeEventListener("pointerdown", notePointerInput, true);
    };
  }, []);

  useLayoutEffect(() => {
    const preview = previewRef.current;
    const stage = preview?.querySelector<HTMLElement>(".demo-stage");
    if (!preview || !stage) return;

    let animationFrame = 0;

    const measure = () => {
      const previewBounds = preview.getBoundingClientRect();
      const stageBounds = stage.getBoundingClientRect();
      const stageLeft = stageBounds.left - previewBounds.left;
      const stageRight = stageBounds.right - previewBounds.left;
      const stageTop = stageBounds.top - previewBounds.top;
      const railClearance = MARKER_SIZE + MARKER_GAP + MARKER_HIT_PADDING;
      const hasSideRails = stageLeft >= railClearance;
      const hasTopRail = stageTop >= railClearance;
      const nextMarkers: MarkerRect[] = [];
      const usedTargets = new Set<HTMLElement>();

      guides.forEach((guide) => {
        const partTarget = stage.querySelector<HTMLElement>(`[data-demo-part="${guide.id}"]`);
        let targets = partTarget ? [partTarget] : [];
        if (!targets.length && guide.selector) {
          targets = Array.from(stage.querySelectorAll<HTMLElement>(guide.selector));
        }
        targets = targets.filter((target) => {
          const bounds = target.getBoundingClientRect();
          const style = window.getComputedStyle(target);
          return bounds.width > 0
            && bounds.height > 0
            && style.display !== "none"
            && style.visibility !== "hidden"
            && Number(style.opacity) > 0;
        });
        if (!targets.length) return;
        if (guide.targetMode !== "all" && guide.targetMode !== "union") {
          const target = partTarget ?? targets.find((candidate) => !usedTargets.has(candidate));
          if (!target) return;
          targets = [target];
        }
        targets.forEach((target) => usedTargets.add(target));

        const bounds = unionBounds(targets);
        if (!bounds) return;
        const rawX = bounds.left - previewBounds.left;
        const rawY = bounds.top - previewBounds.top;
        const x = clamp(rawX, 0, previewBounds.width);
        const y = clamp(rawY, 0, previewBounds.height);
        const width = Math.max(0, Math.min(previewBounds.width, rawX + bounds.width) - x);
        const height = Math.max(0, Math.min(previewBounds.height, rawY + bounds.height) - y);
        const rail = (!hasSideRails && hasTopRail) || (guide.placement === "top" && hasTopRail)
          ? "top"
          : guide.placement === "left" ? "left" : "right";
        const markerX = rail === "top"
          ? x + width / 2 - MARKER_SIZE / 2
          : rail === "left"
            ? stageLeft - MARKER_SIZE - MARKER_GAP
            : stageRight + MARKER_GAP;
        const markerY = rail === "top"
          ? stageTop - MARKER_SIZE - MARKER_GAP
          : y + height / 2 - MARKER_SIZE / 2;

        nextMarkers.push({
          id: guide.id,
          height,
          markerX: clamp(markerX, MARKER_EDGE_INSET, Math.max(MARKER_EDGE_INSET, previewBounds.width - MARKER_SIZE - MARKER_EDGE_INSET)),
          markerY: clamp(markerY, MARKER_EDGE_INSET, Math.max(MARKER_EDGE_INSET, previewBounds.height - MARKER_SIZE - MARKER_EDGE_INSET)),
          rail,
          width,
          x,
          y,
        });

      });

      setMarkers(resolveMarkerCollisions(nextMarkers, previewBounds.width, previewBounds.height));
      preview.dataset.annotationLayoutReady = "true";
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      preview.dataset.annotationLayoutReady = "false";
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
    stage.addEventListener("animationend", scheduleMeasure);
    preview.addEventListener("scroll", scheduleMeasure, true);
    window.addEventListener("resize", scheduleMeasure);
    scheduleMeasure();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      stage.removeEventListener("animationend", scheduleMeasure);
      preview.removeEventListener("scroll", scheduleMeasure, true);
      window.removeEventListener("resize", scheduleMeasure);
      delete preview.dataset.annotationLayoutReady;
    };
  }, [guides, revision, settings]);

  const previewStyle = {
    "--demo-calendar-cell-size": `${settings.cellSize}px`,
  } as CSSProperties;

  const reset = () => {
    setRevision((value) => value + 1);
    setSettings({ ...DEFAULT_DEMO_SETTINGS });
    setColorDrafts({});
    setHoveredPart(null);
    setFocusedPart(null);
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
              data-annotation-part={marker.id}
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
                className="demo-annotation-marker"
                data-active={activePart === guide.id || undefined}
                data-annotation-part={guide.id}
                data-annotation-rail={marker.rail}
                data-annotation-selector={guide.selector}
                key={`marker-${guide.id}`}
                onBlur={() => setFocusedPart((current) => current === guide.id ? null : current)}
                onFocus={() => {
                  if (keyboardInputRef.current) setFocusedPart(guide.id);
                }}
                onPointerDown={() => setFocusedPart(null)}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "touch") setHoveredPart(guide.id);
                }}
                onPointerLeave={() => setHoveredPart((current) => current === guide.id ? null : current)}
                style={{ transform: `translate(${marker.markerX}px, ${marker.markerY}px)` }}
                type="button"
              >
                <span>{guide.id}</span>
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
                data-active={activePart === guide.id || undefined}
                disabled={!markers.some((marker) => marker.id === guide.id)}
                key={guide.id}
                onBlur={() => setFocusedPart((current) => current === guide.id ? null : current)}
                onFocus={() => {
                  if (keyboardInputRef.current) setFocusedPart(guide.id);
                }}
                onPointerDown={() => setFocusedPart(null)}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "touch") setHoveredPart(guide.id);
                }}
                onPointerLeave={() => setHoveredPart((current) => current === guide.id ? null : current)}
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
            {controls.length === 0 ? (
              <div className="demo-customize-empty">
                <strong>当前示例暂无组件专属参数</strong>
                <p>这里不会提供页面背景、编号标注或其他外围样式调整。</p>
              </div>
            ) : controls.map((control) => {
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
