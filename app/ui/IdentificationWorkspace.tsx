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
import {
  resolveAiProvider,
  type AiProviderSelection,
} from "@/lib/ai-provider-config";
import {
  clearRememberedProviderSession,
  getProviderSession,
  getProviderSessionSnapshot,
  hydrateProviderSession,
  persistProviderSession,
  setProviderSession,
  subscribeProviderSession,
} from "@/lib/client/provider-session";
import { AnalysisResults } from "./AnalysisResults";
import { AiProviderSettings } from "./AiProviderSettings";
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
  const [providerSelection, setProviderSelection] = useState<AiProviderSelection>(
    getProviderSession,
  );
  const [rememberProvider, setRememberProvider] = useState(false);
  const [providerStatus, setProviderStatus] = useState<
    "idle" | "loading" | "saving" | "saved" | "error"
  >("loading");
  const [providerStatusMessage, setProviderStatusMessage] = useState("");
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

  let resolvedProvider: ReturnType<typeof resolveAiProvider> | null = null;
  try {
    resolvedProvider = resolveAiProvider(
      providerSelection.providerId,
      providerSelection.model,
      providerSelection.customBaseUrl,
      providerSelection.customProtocol,
    );
  } catch {
    resolvedProvider = null;
  }

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

  useEffect(() => subscribeProviderSession((snapshot) => {
    setProviderSelection(snapshot.selection);
    setRememberProvider(snapshot.remembered);
    setProviderStatus("saved");
    setProviderStatusMessage("当前页面中的 API Key 已清除。");
  }), []);

  useEffect(() => {
    let active = true;
    hydrateProviderSession()
      .then((snapshot) => {
        if (!active) return;
        setProviderSelection(snapshot.selection);
        setRememberProvider(snapshot.remembered);
        setProviderStatus("idle");
        if (snapshot.remembered) {
          setProviderStatusMessage("已从此浏览器的加密存储中恢复 API 配置。");
        }
      })
      .catch((caught) => {
        if (!active) return;
        setProviderStatus("error");
        setProviderStatusMessage(
          caught instanceof Error
            ? `${caught.message} 仍可只在本次页面中使用 Key。`
            : "无法读取本地加密配置，仍可只在本次页面中使用 Key。",
        );
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
    if (!resolvedProvider) {
      setError("AI 服务配置无效，请打开 API 设置检查地址和模型。");
      setPhase("error");
      return;
    }
    if (resolvedProvider.vision === "unsupported") {
      setError(`${resolvedProvider.label} 当前不支持图片输入，请在 API 设置中选择其他服务商。`);
      setPhase("error");
      return;
    }
    const canUseManagedAi = managedAi && resolvedProvider.id === "openai";
    if (!canUseManagedAi && !providerSelection.apiKey.trim()) {
      setError(`请先在 API 设置中填写 ${resolvedProvider.label} 的 API Key。`);
      setPhase("error");
      return;
    }

    let body: Record<string, string>;
    try {
      if (mode === "screenshot") {
        if (!screenshotUrl) throw new Error("请先上传、粘贴或拖入一张截图。");
        const imageDataUrl = await cropScreenshot(
          screenshotUrl,
          selection,
          resolvedProvider.id === "xai" ? "image/jpeg" : "image/webp",
        );
        if (
          resolvedProvider.maxImageDataUrlChars !== undefined
          && imageDataUrl.length > resolvedProvider.maxImageDataUrlChars
        ) {
          throw new Error(`${resolvedProvider.label} 的 Base64 图片超过请求预算，请缩小框选区域。`);
        }
        body = {
          mode: "screenshot",
          imageDataUrl,
          context: context.trim(),
          providerId: providerSelection.providerId,
          model: providerSelection.model,
          customBaseUrl: providerSelection.customBaseUrl,
          customProtocol: providerSelection.customProtocol,
        };
      } else {
        if (!webpageUrl.trim()) throw new Error("请输入要分析的公开网页地址。");
        body = {
          mode: "webpage",
          url: webpageUrl.trim(),
          context: context.trim(),
          providerId: providerSelection.providerId,
          model: providerSelection.model,
          customBaseUrl: providerSelection.customBaseUrl,
          customProtocol: providerSelection.customProtocol,
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
      if (providerSelection.apiKey.trim()) {
        headers["x-ai-api-key"] = providerSelection.apiKey.trim();
      }
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

  const updateProvider = (selection: AiProviderSelection) => {
    setProviderSelection(selection);
    setProviderSession(selection);
    setProviderStatus("idle");
    setProviderStatusMessage("");
  };

  const saveProvider = async () => {
    setProviderStatus("saving");
    setProviderStatusMessage("");
    try {
      resolveAiProvider(
        providerSelection.providerId,
        providerSelection.model,
        providerSelection.customBaseUrl,
        providerSelection.customProtocol,
      );
      const snapshot = await persistProviderSession(providerSelection, rememberProvider);
      setProviderSelection(snapshot.selection);
      setRememberProvider(snapshot.remembered);
      setProviderStatus(snapshot.storageWarning ? "error" : "saved");
      const successMessage = snapshot.remembered
        ? "API 配置已使用 AES-GCM 加密保存在此浏览器。"
        : "配置只保留在当前页面内存中，刷新后会清除。";
      setProviderStatusMessage(
        snapshot.storageWarning
          ? `本次页面配置已应用。${snapshot.storageWarning}刷新后旧配置仍可能恢复，请稍后再次清除。`
          : successMessage,
      );
    } catch (caught) {
      const snapshot = getProviderSessionSnapshot();
      setProviderSelection(snapshot.selection);
      setRememberProvider(snapshot.remembered);
      setProviderStatus("error");
      const baseMessage = caught instanceof Error
        ? caught.message
        : "无法保存 API 配置。";
      setProviderStatusMessage(
        snapshot.remembered
          ? `${baseMessage} 此浏览器中的旧加密记录仍然保留。`
          : baseMessage,
      );
    }
  };

  const clearProvider = async () => {
    if (!window.confirm("清除本浏览器保存的 API 配置和当前页面中的 Key？")) return;
    setProviderStatus("saving");
    setProviderStatusMessage("");
    try {
      const selection = await clearRememberedProviderSession();
      setProviderSelection(selection);
      setRememberProvider(false);
      setProviderStatus("saved");
      setProviderStatusMessage("本地 API 配置已清除。");
    } catch (caught) {
      const snapshot = getProviderSessionSnapshot();
      setProviderSelection(snapshot.selection);
      setRememberProvider(snapshot.remembered);
      setProviderStatus("error");
      setProviderStatusMessage(
        caught instanceof Error
          ? `当前页面中的 Key 已清除，但本地记录删除失败：${caught.message}`
          : "当前页面中的 Key 已清除，但无法确认本地记录已删除。",
      );
    }
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
                    {resolvedProvider?.webpageAnalysis === "web-search"
                      ? "公开网页可使用受限内容检索"
                      : "此服务商需要网页视觉快照"}
                  </strong>
                  <p>
                    {resolvedProvider?.webpageAnalysis === "web-search"
                      ? "允许域名会优先生成视觉快照；其他公开网页仅使用限定到目标域名的内容检索。登录后页面请改用截图。"
                      : "只有站点已允许的精确域名能生成视觉快照；其他网址请先截屏再上传，避免把本站变成任意网页代理。"}
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

            {capabilities && (
              <AiProviderSettings
                disabled={isAnalyzing}
                managedAi={managedAi}
                onChange={updateProvider}
                onClear={() => void clearProvider()}
                onRememberChange={setRememberProvider}
                onSave={() => void saveProvider()}
                remember={rememberProvider}
                selection={providerSelection}
                status={providerStatus}
                statusMessage={providerStatusMessage}
              />
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
                  aria-busy={isCapabilityLoading}
                  className="analyzer-primary-action"
                  disabled={isCapabilityLoading || resolvedProvider?.vision === "unsupported"}
                  onClick={submit}
                  type="button"
                >
                  {isCapabilityLoading
                    ? "正在连接识别服务"
                    : resolvedProvider?.vision === "unsupported"
                      ? "该服务商当前不可用于视觉识别"
                      : mode === "screenshot"
                        ? "识别这个界面"
                        : "分析这个网页"}
                  <span aria-hidden="true">→</span>
                </button>
              )}
              <span>截图与结果不写入本站数据库；请求仍受所选 AI 服务商的条款约束。</span>
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
