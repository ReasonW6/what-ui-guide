"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import type {
  IdentificationCapabilities,
  IdentificationResponse,
} from "@/lib/identification-view";
import { validateScreenshotDataUrl } from "@/lib/identification-contract";
import { AnalysisResults } from "./AnalysisResults";
import {
  cropScreenshot,
  RegionSelector,
  type RegionSelection,
} from "./RegionSelector";
import "./identification-workspace.css";

type InputMode = "screenshot" | "webpage";
type Phase = "idle" | "source-ready" | "analyzing" | "success" | "error";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function responseError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function isIdentificationResponse(value: unknown): value is IdentificationResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<IdentificationResponse>;
  return (
    typeof candidate.summary === "string" &&
    Array.isArray(candidate.candidates) &&
    Array.isArray(candidate.uncertainties) &&
    Array.isArray(candidate.notices) &&
    Array.isArray(candidate.sources) &&
    Boolean(candidate.implementation)
  );
}

function readFileDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("无法读取这张截图。"));
    };
    reader.onerror = () => reject(new Error("无法读取这张截图。"));
    reader.readAsDataURL(file);
  });
}

export function IdentificationWorkspace() {
  const id = useId().replace(/:/g, "");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const abortRef = useRef<AbortController | null>(null);
  const screenshotUrlRef = useRef<string | null>(null);
  const [mode, setMode] = useState<InputMode>("screenshot");
  const [phase, setPhase] = useState<Phase>("idle");
  const [capabilities, setCapabilities] = useState<IdentificationCapabilities | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [context, setContext] = useState("");
  const [webpageUrl, setWebpageUrl] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState("");
  const [selection, setSelection] = useState<RegionSelection | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<IdentificationResponse | null>(null);
  const [resultRevision, setResultRevision] = useState(0);

  const isAnalyzing = phase === "analyzing";
  const isCapabilityLoading = capabilities === null;
  const managedAi = capabilities?.managedAi ?? false;

  useEffect(() => {
    let active = true;
    fetch("/api/identify", { headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<IdentificationCapabilities>;
      })
      .then((next) => {
        if (active) setCapabilities(next);
      })
      .catch(() => {
        if (active) {
          setCapabilities({
            acceptedImageTypes: ACCEPTED_IMAGE_TYPES,
            managedAi: false,
            maxImageBytes: MAX_IMAGE_BYTES,
            visualWebpageCapture: false,
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (screenshotUrlRef.current) URL.revokeObjectURL(screenshotUrlRef.current);
    },
    [],
  );

  const selectMode = (next: InputMode) => {
    setMode(next);
    setError("");
  };

  const moveTab = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const modes: InputMode[] = ["screenshot", "webpage"];
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % modes.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + modes.length) % modes.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = modes.length - 1;
    else return;
    event.preventDefault();
    selectMode(modes[next]);
    window.requestAnimationFrame(() => tabRefs.current[next]?.focus());
  };

  const acceptScreenshot = async (file: File) => {
    const allowedTypes = capabilities?.acceptedImageTypes ?? ACCEPTED_IMAGE_TYPES;
    const maxBytes = capabilities?.maxImageBytes ?? MAX_IMAGE_BYTES;
    if (!allowedTypes.includes(file.type)) {
      setError("请选择 PNG、JPEG、WebP 或非动画 GIF 截图。");
      setPhase("error");
      return;
    }
    if (file.size > maxBytes) {
      setError(`截图不能超过 ${Math.round(maxBytes / 1024 / 1024)} MB。`);
      setPhase("error");
      return;
    }
    if (file.type === "image/gif") {
      try {
        validateScreenshotDataUrl(await readFileDataUrl(file));
      } catch {
        setError("GIF 必须是完整的单帧图片；动画 GIF 请先导出为 PNG 或 WebP。");
        setPhase("error");
        return;
      }
    }
    if (screenshotUrlRef.current) URL.revokeObjectURL(screenshotUrlRef.current);
    const nextUrl = URL.createObjectURL(file);
    screenshotUrlRef.current = nextUrl;
    setScreenshotUrl(nextUrl);
    setScreenshotName(file.name || "粘贴的截图");
    setSelection(null);
    setError("");
    setPhase("source-ready");
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const file = Array.from(event.clipboardData?.files ?? []).find((item) =>
        item.type.startsWith("image/"),
      );
      if (!file) return;
      event.preventDefault();
      setMode("screenshot");
      void acceptScreenshot(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void acceptScreenshot(file);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = Array.from(event.dataTransfer.files).find((item) =>
      item.type.startsWith("image/"),
    );
    if (file) void acceptScreenshot(file);
    else {
      setError("拖入的内容里没有可用图片。");
      setPhase("error");
    }
  };

  const submit = async () => {
    setError("");
    if (!capabilities) {
      setError("识别服务仍在初始化，请稍候再试。");
      setPhase("error");
      return;
    }
    if (!managedAi && !apiKey.trim()) {
      setError("当前站点没有托管 AI 密钥，请输入你自己的 OpenAI API Key 后再分析。");
      setPhase("error");
      return;
    }

    let body: Record<string, string>;
    try {
      if (mode === "screenshot") {
        if (!screenshotUrl) throw new Error("请先上传、粘贴或拖入一张截图。");
        body = {
          mode: "screenshot",
          imageDataUrl: await cropScreenshot(screenshotUrl, selection),
          context: context.trim(),
        };
      } else {
        if (!webpageUrl.trim()) throw new Error("请输入要分析的公开网页地址。");
        body = {
          mode: "webpage",
          url: webpageUrl.trim(),
          context: context.trim(),
        };
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法读取输入内容。");
      setPhase("error");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("analyzing");
    try {
      const headers: Record<string, string> = {
        accept: "application/json",
        "content-type": "application/json",
      };
      if (apiKey.trim()) headers["x-openai-api-key"] = apiKey.trim();
      const response = await fetch("/api/identify", {
        body: JSON.stringify(body),
        headers,
        method: "POST",
        signal: controller.signal,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(responseError(payload, `分析失败（${response.status}），请稍后重试。`));
      }
      if (!isIdentificationResponse(payload)) {
        throw new Error("服务返回了无法识别的结果格式，请重试。");
      }
      setResult(payload);
      setResultRevision((revision) => revision + 1);
      setPhase("success");
    } catch (caught) {
      if (controller.signal.aborted) {
        setPhase(result ? "success" : screenshotUrl ? "source-ready" : "idle");
      } else {
        setError(caught instanceof Error ? caught.message : "分析失败，请稍后重试。");
        setPhase("error");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="analyzer-shell">
      <div className="analyzer-intro">
        <div>
          <p className="eyebrow">AI VISUAL IDENTIFICATION</p>
          <h2 id="identify-title">把截图变成准确的组件名称</h2>
          <p>
            上传局部界面或输入公开网页，获得候选术语、可观察证据、易混区别、实现建议和可复制代码。
          </p>
        </div>
        <ul aria-label="分析能力">
          <li><strong>81</strong><span>个受控术语</span></li>
          <li><strong>3</strong><span>个候选以内</span></li>
          <li><strong>0</strong><span>默认持久保存</span></li>
        </ul>
      </div>

      <div className="analyzer-card">
        <div className="analyzer-tabs" aria-label="选择识别输入方式" role="tablist">
          {(["screenshot", "webpage"] as const).map((item, index) => (
            <button
              aria-controls={`${id}-${item}-panel`}
              aria-selected={mode === item}
              id={`${id}-${item}-tab`}
              key={item}
              onClick={() => selectMode(item)}
              onKeyDown={(event) => moveTab(event, index)}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              role="tab"
              tabIndex={mode === item ? 0 : -1}
              type="button"
            >
              <span aria-hidden="true">{item === "screenshot" ? "▣" : "↗"}</span>
              {item === "screenshot" ? "截图识别" : "网页识别"}
            </button>
          ))}
        </div>

        <div className="analyzer-work-grid">
          <div className="analyzer-input-column">
            {mode === "screenshot" ? (
              <div
                aria-labelledby={`${id}-screenshot-tab`}
                id={`${id}-screenshot-panel`}
                role="tabpanel"
              >
                {screenshotUrl ? (
                  <>
                    <div className="analyzer-source-line">
                      <div>
                        <strong>{screenshotName}</strong>
                        <span>拖动框选单个组件，判断会更准确。</span>
                      </div>
                      <label className="analyzer-change-file">
                        换一张
                        <input
                          accept={ACCEPTED_IMAGE_TYPES.join(",")}
                          className="analyzer-file-input"
                          disabled={isAnalyzing}
                          onChange={onFileChange}
                          type="file"
                        />
                      </label>
                    </div>
                    <RegionSelector
                      disabled={isAnalyzing}
                      imageUrl={screenshotUrl}
                      onChange={setSelection}
                      selection={selection}
                    />
                  </>
                ) : (
                  <label
                    className="analyzer-dropzone"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={onDrop}
                  >
                    <input
                      accept={ACCEPTED_IMAGE_TYPES.join(",")}
                      className="analyzer-file-input"
                      disabled={isAnalyzing}
                      onChange={onFileChange}
                      type="file"
                    />
                    <span aria-hidden="true">⌗</span>
                    <strong>上传、粘贴或拖入截图</strong>
                    <small>PNG / JPEG / WebP / GIF，最大 8 MB</small>
                  </label>
                )}
              </div>
            ) : (
              <div
                aria-labelledby={`${id}-webpage-tab`}
                id={`${id}-webpage-panel`}
                role="tabpanel"
              >
                <label className="analyzer-field">
                  <span>公开网页地址</span>
                  <input
                    autoComplete="url"
                    disabled={isAnalyzing}
                    inputMode="url"
                    onChange={(event) => setWebpageUrl(event.target.value)}
                    placeholder="https://example.com/product"
                    type="url"
                    value={webpageUrl}
                  />
                </label>
                <div className="analyzer-web-note">
                  <strong>
                    {capabilities?.visualWebpageCapture
                      ? "允许域名会生成网页视觉快照"
                      : "默认分析公开网页内容"}
                  </strong>
                  <p>
                    为避免把服务变成任意网页代理，视觉抓取只对站点配置的精确域名开放；其他公开网页使用带域名限制的内容检索。登录后页面请改用截图。
                  </p>
                </div>
              </div>
            )}

            <label className="analyzer-field analyzer-context-field">
              <span>补充操作线索 <small>可选</small></span>
              <textarea
                disabled={isAnalyzing}
                maxLength={500}
                onChange={(event) => setContext(event.target.value)}
                placeholder="例如：点击后会从右侧滑出；这个区域可以输入并筛选选项……"
                rows={3}
                value={context}
              />
            </label>

            {!managedAi && capabilities && (
              <label className="analyzer-field analyzer-key-field">
                <span>OpenAI API Key <small>仅随本次请求发送</small></span>
                <input
                  autoComplete="off"
                  disabled={isAnalyzing}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="sk-…"
                  spellCheck={false}
                  type="password"
                  value={apiKey}
                />
              </label>
            )}
            {managedAi && capabilities && (
              <details className="analyzer-own-key">
                <summary>使用自己的 OpenAI API Key（可选）</summary>
                <label className="analyzer-field analyzer-key-field">
                  <span>OpenAI API Key <small>填写后不使用本站公共额度</small></span>
                  <input
                    autoComplete="off"
                    disabled={isAnalyzing}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="sk-…"
                    spellCheck={false}
                    type="password"
                    value={apiKey}
                  />
                </label>
              </details>
            )}

            {error && <p className="analyzer-error" role="alert">{error}</p>}
            <p className="analyzer-progress" role="status">
              {isAnalyzing
                ? "正在比对视觉特征、目录术语与实现模式……"
                : isCapabilityLoading
                  ? "正在检查识别服务能力……"
                  : " "}
            </p>
            <div className="analyzer-submit-row">
              {isAnalyzing ? (
                <button className="analyzer-secondary-action" onClick={cancel} type="button">
                  取消分析
                </button>
              ) : (
                <button
                  className="analyzer-primary-action"
                  disabled={isCapabilityLoading}
                  onClick={submit}
                  type="button"
                >
                  {isCapabilityLoading
                    ? "正在连接识别服务"
                    : mode === "screenshot"
                      ? "识别这个界面"
                      : "分析这个网页"}
                  <span aria-hidden="true">→</span>
                </button>
              )}
              <span>输入默认不写入本站数据库；OpenAI API 仍按其服务条款处理请求。</span>
            </div>
          </div>

          {!result && (
            <aside className="analyzer-empty-state" aria-label="识别结果说明">
              <span className="analyzer-empty-mark" aria-hidden="true">?</span>
              <h3>结果会告诉你“为什么”</h3>
              <ol>
                <li><span>01</span><p><strong>给出候选</strong>只映射到词典现有术语，不编造组件名。</p></li>
                <li><span>02</span><p><strong>展示证据</strong>区分截图中可见事实与无法推断的行为。</p></li>
                <li><span>03</span><p><strong>直接实现</strong>提供结构、交互、无障碍与可复制代码。</p></li>
              </ol>
            </aside>
          )}
        </div>
      </div>

      {result && <AnalysisResults key={resultRevision} result={result} />}
    </div>
  );
}
