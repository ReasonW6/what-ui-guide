"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  AiProviderConfigError,
  aiProviderPresets,
  getAiProviderPreset,
  providerConnectionEndpoint,
  providerEndpoint,
  resolveAiProvider,
  type AiProviderId,
  type AiProviderProtocol,
  type AiProviderSelection,
} from "@/lib/ai-provider-config";
import { fetchBoundedProviderJson } from "@/lib/client/bounded-provider-fetch";

type AiProviderSettingsSummaryProps = {
  disabled: boolean;
  managedAi: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  selection: AiProviderSelection;
};

type AiProviderSettingsPanelProps = {
  disabled: boolean;
  managedAi: boolean;
  onChange: (selection: AiProviderSelection) => void;
  onClear: () => void;
  onClose: () => void;
  onRememberChange: (remember: boolean) => void;
  onSave: () => void;
  remember: boolean;
  selection: AiProviderSelection;
  status: "idle" | "loading" | "saving" | "saved" | "error";
  statusMessage: string;
};

type ProviderConnectionStatus = "idle" | "testing" | "connected" | "warning" | "error";

const protocolOptions: ReadonlyArray<{
  value: AiProviderProtocol;
  label: string;
}> = [
  { value: "openai-chat", label: "OpenAI Chat Completions" },
  { value: "openai-responses", label: "OpenAI Responses" },
  { value: "anthropic-messages", label: "Anthropic Messages" },
];

const providerMarks: Record<AiProviderId, string> = {
  openai: "OA",
  anthropic: "AN",
  kimi: "KM",
  "kimi-global": "KG",
  siliconflow: "CN",
  "siliconflow-global": "GL",
  openrouter: "OR",
  gemini: "GM",
  xai: "X",
  custom: "+",
};

const providerOptions = [
  ...aiProviderPresets.map((provider) => provider.id),
  "custom",
] as const;

function protocolLabel(protocol: AiProviderProtocol): string {
  return protocolOptions.find((option) => option.value === protocol)?.label ?? protocol;
}

function maskedKey(value: string): string {
  if (!value) return "未填写 Key";
  if (value.length <= 8) return "已填写 Key";
  return `${value.slice(0, 3)}••••${value.slice(-4)}`;
}

function payloadErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  if ("error" in payload && payload.error && typeof payload.error === "object") {
    const message = "message" in payload.error ? payload.error.message : null;
    if (typeof message === "string" && message.trim()) return message;
  }
  if ("message" in payload && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }
  return fallback;
}

export function AiProviderSettingsSummary({
  disabled,
  managedAi,
  onOpenChange,
  open,
  selection,
}: AiProviderSettingsSummaryProps) {
  const preset = selection.providerId === "custom"
    ? null
    : getAiProviderPreset(selection.providerId);
  const hasApiKey = Boolean(selection.apiKey.trim());
  const usingManagedOpenAi = managedAi
    && selection.providerId === "openai"
    && !hasApiKey;

  return (
    <section className="provider-settings-summary" aria-label="AI 服务设置">
      <div>
        <span>当前服务</span>
        <strong>{preset?.shortLabel ?? "自定义 API"}</strong>
        <small>
          {usingManagedOpenAi ? "本站托管模型" : selection.model || "尚未选择模型"}
          {" · "}{maskedKey(selection.apiKey.trim())}
        </small>
      </div>
      <button
        aria-controls={open ? "provider-settings-panel" : undefined}
        aria-expanded={open}
        className="provider-settings-toggle"
        disabled={disabled}
        id="provider-settings-toggle"
        onClick={() => onOpenChange(!open)}
        type="button"
      >
        <span aria-hidden="true">⚙</span>
        {open ? "关闭设置" : "API 设置"}
      </button>
    </section>
  );
}

export function AiProviderSettingsPanel({
  disabled,
  managedAi,
  onChange,
  onClear,
  onClose,
  onRememberChange,
  onSave,
  remember,
  selection,
  status,
  statusMessage,
}: AiProviderSettingsPanelProps) {
  const [showKey, setShowKey] = useState(false);
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ProviderConnectionStatus>("idle");
  const [connectionMessage, setConnectionMessage] = useState("");
  const connectionAbortRef = useRef<AbortController | null>(null);
  const providerTriggerRef = useRef<HTMLButtonElement>(null);
  const providerOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const preset = selection.providerId === "custom"
    ? null
    : getAiProviderPreset(selection.providerId);
  const hasApiKey = Boolean(selection.apiKey.trim());
  const usingManagedOpenAi = managedAi
    && selection.providerId === "openai"
    && !hasApiKey;
  const settingsBusy = disabled
    || status === "loading"
    || status === "saving"
    || connectionStatus === "testing";

  useEffect(() => {
    providerTriggerRef.current?.focus();
    return () => {
      connectionAbortRef.current?.abort();
      connectionAbortRef.current = null;
    };
  }, []);

  const endpointPreview = useMemo(() => {
    try {
      return {
        error: "",
        errorCode: null,
        value: providerEndpoint(resolveAiProvider(
          selection.providerId,
          selection.model,
          selection.customBaseUrl,
          selection.customProtocol,
        )),
      };
    } catch (error) {
      return {
        error: error instanceof AiProviderConfigError ? error.message : "配置无效。",
        errorCode: error instanceof AiProviderConfigError ? error.code : "invalid_provider",
        value: "",
      };
    }
  }, [selection]);

  const update = <Key extends keyof AiProviderSelection>(
    key: Key,
    value: AiProviderSelection[Key],
  ) => {
    setConnectionStatus("idle");
    setConnectionMessage("");
    const endpointChanged = (key === "customBaseUrl" || key === "customProtocol")
      && value !== selection[key];
    if (endpointChanged) setShowKey(false);
    onChange({
      ...selection,
      [key]: value,
      ...(endpointChanged ? { apiKey: "" } : {}),
    });
  };

  const selectProvider = (providerId: AiProviderId) => {
    setShowKey(false);
    setConnectionStatus("idle");
    setConnectionMessage("");
    if (providerId === "custom") {
      onChange({
        ...selection,
        providerId,
        model: "",
        customBaseUrl: "",
        customProtocol: "openai-chat",
        apiKey: "",
      });
      return;
    }
    const next = getAiProviderPreset(providerId);
    onChange({
      ...selection,
      providerId,
      model: next.defaultModel,
      customBaseUrl: "",
      customProtocol: next.protocol,
      apiKey: "",
    });
  };

  const focusProviderOption = (index: number) => {
    const boundedIndex = (index + providerOptions.length) % providerOptions.length;
    window.requestAnimationFrame(() => providerOptionRefs.current[boundedIndex]?.focus());
  };

  const openProviderMenu = (preferredIndex?: number) => {
    if (settingsBusy) return;
    setProviderMenuOpen(true);
    const selectedIndex = providerOptions.indexOf(selection.providerId);
    focusProviderOption(preferredIndex ?? Math.max(selectedIndex, 0));
  };

  const closeProviderMenu = (restoreFocus = false) => {
    setProviderMenuOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => providerTriggerRef.current?.focus());
    }
  };

  const onProviderOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      focusProviderOption(index + (event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusProviderOption(event.key === "Home" ? 0 : providerOptions.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeProviderMenu(true);
    }
  };

  const testConnection = async () => {
    if (!hasApiKey || endpointPreview.error) return;
    connectionAbortRef.current?.abort();
    const controller = new AbortController();
    connectionAbortRef.current = controller;
    setShowKey(false);
    setConnectionStatus("testing");
    setConnectionMessage("正在验证服务地址、API Key 与模型…");
    try {
      const browserDirect = selection.providerId === "siliconflow";
      const { payload, response } = browserDirect
        ? await fetchBoundedProviderJson(
          providerConnectionEndpoint(resolveAiProvider(
            selection.providerId,
            selection.model,
            selection.customBaseUrl,
            selection.customProtocol,
          )),
          {
            headers: { authorization: `Bearer ${selection.apiKey.trim()}` },
            method: "GET",
          },
          { signal: controller.signal },
        )
        : await fetchBoundedProviderJson("/api/identify", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-ai-api-key": selection.apiKey.trim(),
            },
            body: JSON.stringify({
              action: "connect",
              providerId: selection.providerId,
              model: selection.model,
              customBaseUrl: selection.customBaseUrl,
              customProtocol: selection.customProtocol,
            }),
          }, { signal: controller.signal });
      if (
        controller.signal.aborted
        || connectionAbortRef.current !== controller
      ) return;
      if (!response.ok) {
        throw new Error(payloadErrorMessage(
          payload,
          `连接检查失败（HTTP ${response.status}）。`,
        ));
      }
      const modelAvailable = browserDirect
        ? payload
          && typeof payload === "object"
          && "data" in payload
          && Array.isArray(payload.data)
          ? payload.data.some((entry) => (
              entry
              && typeof entry === "object"
              && "id" in entry
              && entry.id === selection.model
            ))
          : null
        : payload
          && typeof payload === "object"
          && "modelAvailable" in payload
          ? payload.modelAvailable
          : null;
      if (modelAvailable === false) {
        setConnectionStatus("warning");
        setConnectionMessage("服务与 API Key 已连接，但当前模型不在该站点的可用模型列表中。请检查模型名称。");
      } else {
        setConnectionStatus("connected");
        setConnectionMessage(modelAvailable === true
          ? "连接成功：服务地址、API Key 与当前模型均已通过验证。"
          : "连接成功：服务地址与 API Key 已通过验证。该服务未返回可比对的模型列表。");
      }
    } catch (error) {
      if (connectionAbortRef.current !== controller) return;
      if (controller.signal.aborted) {
        setConnectionStatus("idle");
        setConnectionMessage("连接检查已取消。");
        return;
      }
      setConnectionStatus("error");
      setConnectionMessage(error instanceof Error ? error.message : "连接检查失败，请稍后重试。");
    } finally {
      if (connectionAbortRef.current === controller) {
        connectionAbortRef.current = null;
      }
    }
  };

  const cancelConnection = () => {
    connectionAbortRef.current?.abort(new Error("连接检查已取消。"));
  };

  return (
    <aside
      aria-labelledby="provider-settings-title"
      className="provider-settings-panel"
      id="provider-settings-panel"
    >
          <div className="provider-settings-heading">
            <div>
              <p className="eyebrow">YOUR PROVIDER, YOUR KEY</p>
              <h3 id="provider-settings-title">配置 AI 服务</h3>
            </div>
            <button
              aria-label="关闭 API 设置"
              className="provider-settings-close"
              onClick={() => {
                onClose();
                window.requestAnimationFrame(() => {
                  document.getElementById("provider-settings-toggle")?.focus();
                });
              }}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <p className="provider-settings-description">
            字段修改会立即用于下一次识别；保存按钮只决定刷新后是否保留。
          </p>

          <div className="provider-settings-grid">
            <div className="analyzer-field">
              <span>服务商</span>
              <div
                className="provider-picker"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    closeProviderMenu();
                  }
                }}
              >
                <button
                  aria-controls={providerMenuOpen ? "provider-listbox" : undefined}
                  aria-expanded={providerMenuOpen}
                  aria-haspopup="listbox"
                  className="provider-picker-trigger"
                  disabled={settingsBusy}
                  onClick={() => {
                    if (providerMenuOpen) closeProviderMenu();
                    else openProviderMenu();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                      event.preventDefault();
                      openProviderMenu(event.key === "ArrowDown" ? 0 : providerOptions.length - 1);
                    }
                  }}
                  ref={providerTriggerRef}
                  type="button"
                >
                  <span className="provider-picker-mark" aria-hidden="true">
                    {providerMarks[selection.providerId]}
                  </span>
                  <span className="provider-picker-current">
                    <strong>{preset?.label ?? "自定义 API"}</strong>
                    <small>{protocolLabel(preset?.protocol ?? selection.customProtocol)}</small>
                  </span>
                  <span className="provider-picker-chevron" aria-hidden="true">⌄</span>
                </button>
                {providerMenuOpen && (
                  <div className="provider-picker-list" id="provider-listbox" role="listbox">
                    {providerOptions.map((providerId, index) => {
                      const option = providerId === "custom"
                        ? null
                        : getAiProviderPreset(providerId);
                      const selected = selection.providerId === providerId;
                      return (
                        <button
                          aria-selected={selected}
                          className="provider-picker-option"
                          key={providerId}
                          onClick={() => {
                            selectProvider(providerId);
                            closeProviderMenu(true);
                          }}
                          onKeyDown={(event) => onProviderOptionKeyDown(event, index)}
                          ref={(node) => {
                            providerOptionRefs.current[index] = node;
                          }}
                          role="option"
                          tabIndex={selected ? 0 : -1}
                          type="button"
                        >
                          <span className="provider-picker-mark" aria-hidden="true">
                            {providerMarks[providerId]}
                          </span>
                          <span>
                            <strong>{option?.label ?? "自定义 API"}</strong>
                            <small>
                              {option ? protocolLabel(option.protocol) : "手动配置兼容端点"}
                            </small>
                          </span>
                          <span className="provider-picker-check" aria-hidden="true">
                            {selected ? "✓" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {selection.providerId === "custom" && (
              <label className="analyzer-field">
                <span>兼容协议</span>
                <select
                  disabled={settingsBusy}
                  onChange={(event) => update(
                    "customProtocol",
                    event.target.value as AiProviderProtocol,
                  )}
                  value={selection.customProtocol}
                >
                  {protocolOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="analyzer-field">
              <span>
                模型名称
                {usingManagedOpenAi && <small>使用本站额度时由部署方固定</small>}
              </span>
              <input
                aria-describedby="provider-endpoint-feedback"
                aria-invalid={endpointPreview.errorCode === "invalid_model"}
                autoComplete="off"
                disabled={settingsBusy || usingManagedOpenAi}
                onChange={(event) => update("model", event.target.value)}
                placeholder={usingManagedOpenAi ? "由部署方配置" : "例如：视觉模型名称"}
                spellCheck={false}
                value={usingManagedOpenAi ? "" : selection.model}
              />
            </label>

            <label className="analyzer-field provider-settings-url">
              <span>API Base URL</span>
              <input
                aria-describedby="provider-endpoint-feedback"
                aria-invalid={selection.providerId === "custom"
                  && Boolean(endpointPreview.error)
                  && endpointPreview.errorCode !== "invalid_model"}
                autoComplete="url"
                disabled={settingsBusy || selection.providerId !== "custom"}
                inputMode="url"
                onChange={(event) => update("customBaseUrl", event.target.value)}
                placeholder="https://api.example.com"
                readOnly={selection.providerId !== "custom"}
                spellCheck={false}
                value={preset?.baseUrl ?? selection.customBaseUrl}
              />
              <small>
                {selection.providerId === "custom"
                  ? "填写站点根地址时会自动补 /v1；也可直接填写平台给出的完整 Base URL。"
                  : "预设地址不可由浏览器覆盖。"}
              </small>
            </label>

            <div className="analyzer-field provider-settings-key">
              <label htmlFor="provider-api-key">API Key</label>
              <span className="provider-key-control">
                <input
                  autoComplete="off"
                  disabled={settingsBusy}
                  id="provider-api-key"
                  maxLength={512}
                  onChange={(event) => update("apiKey", event.target.value)}
                  placeholder={managedAi && selection.providerId === "openai"
                    ? "可留空使用本站额度"
                    : "粘贴服务商提供的 Key"}
                  spellCheck={false}
                  type={showKey ? "text" : "password"}
                  value={selection.apiKey}
                />
                <button
                  aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
                  disabled={!hasApiKey || settingsBusy}
                  onClick={() => setShowKey((value) => !value)}
                  type="button"
                >
                  {showKey ? "隐藏" : "显示"}
                </button>
              </span>
            </div>
          </div>

          {preset && (
            <p className={preset.vision === "unsupported"
              ? "provider-settings-warning"
              : "provider-settings-note"}
            >
              {preset.note}
            </p>
          )}

          <div className="provider-endpoint-preview" id="provider-endpoint-feedback">
            <span>最终请求地址</span>
            {endpointPreview.value
              ? <code>{endpointPreview.value}</code>
              : <strong role="alert">{endpointPreview.error || "填写地址与模型后显示"}</strong>}
          </div>

          {connectionMessage && (
            <p
              className={`provider-connection-result provider-connection-${connectionStatus}`}
              role={connectionStatus === "error" ? "alert" : "status"}
            >
              {connectionMessage}
            </p>
          )}

          <label className="provider-remember-option">
            <input
              checked={remember}
              disabled={settingsBusy || (!hasApiKey && !remember)}
              onChange={(event) => onRememberChange(event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>在此浏览器加密保存</strong>
              <small>使用 AES-GCM 与不可导出密钥存入本站 IndexedDB；不勾选时只保留到本页刷新。</small>
            </span>
          </label>

          <p className="provider-security-note">
            其他网站受同源策略限制，不能直接读取这里的存储；但本站同源脚本漏洞、恶意扩展、DevTools 或受控设备仍可能取得使用权。发起识别时，Key 会临时经过本站 Worker 并发送给所选服务商。
          </p>

          {statusMessage && (
            <p
              className={status === "error" ? "provider-settings-error" : "provider-settings-status"}
              role={status === "error" ? "alert" : "status"}
            >
              {statusMessage}
            </p>
          )}

          <div className="provider-settings-actions">
            <button
              className="analyzer-secondary-action provider-connect-action"
              disabled={connectionStatus === "testing"
                ? disabled || status === "loading" || status === "saving"
                : settingsBusy || !hasApiKey || Boolean(endpointPreview.error)}
              onClick={connectionStatus === "testing" ? cancelConnection : testConnection}
              type="button"
            >
              {connectionStatus === "testing" ? "取消连接" : "连接"}
            </button>
            <button
              className="analyzer-primary-action"
              disabled={settingsBusy
                || Boolean(endpointPreview.error)
                || (remember && !hasApiKey)}
              onClick={() => {
                setShowKey(false);
                onSave();
              }}
              type="button"
            >
              {status === "saving"
                ? "正在保存…"
                : remember
                  ? "加密保存到此浏览器"
                  : "改为仅本次页面"}
            </button>
            <button
              className="analyzer-secondary-action"
              disabled={settingsBusy}
              onClick={onClear}
              type="button"
            >
              清除本地配置
            </button>
          </div>
    </aside>
  );
}
