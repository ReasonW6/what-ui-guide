"use client";

import { useMemo, useState } from "react";
import {
  AiProviderConfigError,
  aiProviderPresets,
  getAiProviderPreset,
  providerEndpoint,
  resolveAiProvider,
  type AiProviderId,
  type AiProviderProtocol,
  type AiProviderSelection,
} from "@/lib/ai-provider-config";

type AiProviderSettingsProps = {
  disabled: boolean;
  managedAi: boolean;
  onChange: (selection: AiProviderSelection) => void;
  onClear: () => void;
  onRememberChange: (remember: boolean) => void;
  onSave: () => void;
  remember: boolean;
  selection: AiProviderSelection;
  status: "idle" | "loading" | "saving" | "saved" | "error";
  statusMessage: string;
};

const protocolOptions: ReadonlyArray<{
  value: AiProviderProtocol;
  label: string;
}> = [
  { value: "openai-chat", label: "OpenAI Chat Completions" },
  { value: "openai-responses", label: "OpenAI Responses" },
  { value: "anthropic-messages", label: "Anthropic Messages" },
];

function maskedKey(value: string): string {
  if (!value) return "未填写 Key";
  if (value.length <= 8) return "已填写 Key";
  return `${value.slice(0, 3)}••••${value.slice(-4)}`;
}

export function AiProviderSettings({
  disabled,
  managedAi,
  onChange,
  onClear,
  onRememberChange,
  onSave,
  remember,
  selection,
  status,
  statusMessage,
}: AiProviderSettingsProps) {
  const [open, setOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const preset = selection.providerId === "custom"
    ? null
    : getAiProviderPreset(selection.providerId);
  const hasApiKey = Boolean(selection.apiKey.trim());
  const usingManagedOpenAi = managedAi
    && selection.providerId === "openai"
    && !hasApiKey;
  const settingsBusy = disabled || status === "loading" || status === "saving";

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

  return (
    <section className="provider-settings" aria-label="AI 服务设置">
      <div className="provider-settings-summary">
        <div>
          <span>当前服务</span>
          <strong>{preset?.shortLabel ?? "自定义 API"}</strong>
          <small>
            {usingManagedOpenAi ? "本站托管模型" : selection.model || "尚未选择模型"}
            {" · "}{maskedKey(selection.apiKey.trim())}
          </small>
        </div>
        <button
          aria-expanded={open}
          aria-controls={open ? "provider-settings-panel" : undefined}
          className="provider-settings-toggle"
          disabled={disabled}
          onClick={() => setOpen((value) => {
            if (value) setShowKey(false);
            return !value;
          })}
          type="button"
        >
          <span aria-hidden="true">⚙</span>
          API 设置
        </button>
      </div>

      {open && (
        <div className="provider-settings-panel" id="provider-settings-panel">
          <div className="provider-settings-heading">
            <div>
              <p className="eyebrow">YOUR PROVIDER, YOUR KEY</p>
              <h3 id="provider-settings-title">配置 AI 服务</h3>
            </div>
            <p>字段修改会立即用于下一次识别；保存按钮只决定刷新后是否保留。</p>
          </div>

          <div className="provider-settings-grid">
            <label className="analyzer-field">
              <span>服务商</span>
              <select
                disabled={settingsBusy}
                onChange={(event) => selectProvider(event.target.value as AiProviderId)}
                value={selection.providerId}
              >
                <optgroup label="官方与聚合平台">
                  {aiProviderPresets.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}{provider.vision === "unsupported" ? "（本功能暂不可用）" : ""}
                    </option>
                  ))}
                </optgroup>
                <option value="custom">自定义 API</option>
              </select>
            </label>

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
                  : "官方预设地址不可由浏览器覆盖。"}
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
        </div>
      )}
    </section>
  );
}
