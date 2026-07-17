export type AiProviderId =
  | "openai"
  | "anthropic"
  | "kimi"
  | "kimi-global"
  | "siliconflow"
  | "siliconflow-global"
  | "openrouter"
  | "gemini"
  | "xai"
  | "custom";

export type AiProviderProtocol =
  | "openai-responses"
  | "openai-chat"
  | "anthropic-messages";

export type ProviderImageMediaType =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/gif";

export interface AiProviderPreset {
  readonly id: Exclude<AiProviderId, "custom">;
  readonly label: string;
  readonly shortLabel: string;
  readonly baseUrl: string;
  readonly defaultModel: string;
  readonly protocol: AiProviderProtocol;
  readonly vision: "supported" | "model-dependent" | "unsupported";
  readonly webpageAnalysis: "web-search" | "snapshot-only";
  readonly structuredOutput: "json-schema" | "json-object";
  readonly imageUrlShape?: "object" | "string";
  readonly temperature?: number;
  readonly maxImageDataUrlChars?: number;
  readonly allowedImageMediaTypes?: readonly ProviderImageMediaType[];
  readonly note: string;
}

export interface AiProviderSelection {
  readonly providerId: AiProviderId;
  readonly model: string;
  readonly customBaseUrl: string;
  readonly customProtocol: AiProviderProtocol;
  readonly apiKey: string;
}

export interface ResolvedAiProvider {
  readonly id: AiProviderId;
  readonly label: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly protocol: AiProviderProtocol;
  readonly vision: "supported" | "model-dependent" | "unsupported";
  readonly webpageAnalysis: "web-search" | "snapshot-only";
  readonly structuredOutput: "json-schema" | "json-object";
  readonly imageUrlShape: "object" | "string";
  readonly temperature?: number;
  readonly maxImageDataUrlChars?: number;
  readonly allowedImageMediaTypes?: readonly ProviderImageMediaType[];
}

export class AiProviderConfigError extends Error {
  readonly code:
    | "invalid_provider"
    | "invalid_model"
    | "invalid_base_url"
    | "unsafe_base_url"
    | "invalid_api_key";

  constructor(
    code: AiProviderConfigError["code"],
    message: string,
  ) {
    super(message);
    this.name = "AiProviderConfigError";
    this.code = code;
  }
}

export const aiProviderPresets: readonly AiProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    shortLabel: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5.6-sol",
    protocol: "openai-responses",
    vision: "supported",
    webpageAnalysis: "web-search",
    structuredOutput: "json-schema",
    note: "支持截图、结构化结果与受限网页检索。",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    shortLabel: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-5",
    protocol: "anthropic-messages",
    vision: "supported",
    webpageAnalysis: "snapshot-only",
    structuredOutput: "json-schema",
    note: "使用 Claude Messages 原生视觉接口。",
  },
  {
    id: "kimi",
    label: "Kimi / Moonshot",
    shortLabel: "Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    defaultModel: "kimi-k2.6",
    protocol: "openai-chat",
    vision: "supported",
    webpageAnalysis: "snapshot-only",
    structuredOutput: "json-schema",
    temperature: 1,
    note: "中国大陆站点，默认使用 Kimi 视觉模型。",
  },
  {
    id: "kimi-global",
    label: "Kimi Global",
    shortLabel: "Kimi Global",
    baseUrl: "https://api.moonshot.ai/v1",
    defaultModel: "kimi-k2.6",
    protocol: "openai-chat",
    vision: "supported",
    webpageAnalysis: "snapshot-only",
    structuredOutput: "json-schema",
    temperature: 1,
    note: "国际站点，默认使用 Kimi 视觉模型。",
  },
  {
    id: "siliconflow",
    label: "硅基流动 · 中国站",
    shortLabel: "硅基流动 中国站",
    baseUrl: "https://api.siliconflow.cn/v1",
    defaultModel: "Qwen/Qwen3.6-27B",
    protocol: "openai-chat",
    vision: "model-dependent",
    webpageAnalysis: "snapshot-only",
    structuredOutput: "json-object",
    note: "使用 cloud.siliconflow.cn 创建的 Key；国内站与国际站的 Key 不可混用。",
  },
  {
    id: "siliconflow-global",
    label: "硅基流动 · 国际站",
    shortLabel: "硅基流动 国际站",
    baseUrl: "https://api.siliconflow.com/v1",
    defaultModel: "Qwen/Qwen3.6-27B",
    protocol: "openai-chat",
    vision: "model-dependent",
    webpageAnalysis: "snapshot-only",
    structuredOutput: "json-object",
    note: "使用 cloud.siliconflow.com 创建的 Key；请确认账户与 API 站点一致。",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    shortLabel: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemini-3.5-flash",
    protocol: "openai-chat",
    vision: "model-dependent",
    webpageAnalysis: "snapshot-only",
    structuredOutput: "json-schema",
    note: "聚合平台；请使用带图片输入能力的模型。",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    shortLabel: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-3.5-flash",
    protocol: "openai-chat",
    vision: "supported",
    webpageAnalysis: "snapshot-only",
    structuredOutput: "json-schema",
    temperature: 1,
    note: "使用 Google 的 OpenAI 兼容端点。",
  },
  {
    id: "xai",
    label: "xAI Grok",
    shortLabel: "xAI",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-4.5",
    protocol: "openai-chat",
    vision: "supported",
    webpageAnalysis: "snapshot-only",
    structuredOutput: "json-schema",
    allowedImageMediaTypes: ["image/jpeg", "image/png"],
    note: "使用支持图片理解的 Grok 模型。",
  },
] as const;

const providerIds = new Set<AiProviderId>([
  ...aiProviderPresets.map((provider) => provider.id),
  "custom",
]);

const blockedHostnameSuffixes = [
  "localhost",
  "local",
  "internal",
  "intranet",
  "home",
  "lan",
  "test",
  "invalid",
  "example",
  "onion",
  "nip.io",
  "sslip.io",
  "localtest.me",
  "lvh.me",
  "vcap.me",
  "traefik.me",
  "local.gd",
  "localhost.direct",
] as const;

export const defaultAiProviderSelection: AiProviderSelection = {
  providerId: "openai",
  model: aiProviderPresets[0].defaultModel,
  customBaseUrl: "",
  customProtocol: "openai-chat",
  apiKey: "",
};

export function isAiProviderId(value: unknown): value is AiProviderId {
  return typeof value === "string" && providerIds.has(value as AiProviderId);
}

export function getAiProviderPreset(
  id: Exclude<AiProviderId, "custom">,
): AiProviderPreset {
  const preset = aiProviderPresets.find((provider) => provider.id === id);
  if (!preset) {
    throw new AiProviderConfigError("invalid_provider", "不支持这个 AI 服务商。");
  }
  return preset;
}

function hasExplicitPort(value: string): boolean {
  const schemeEnd = value.indexOf("://");
  if (schemeEnd < 0) return false;
  const authorityStart = schemeEnd + 3;
  const authorityEndOffset = value.slice(authorityStart).search(/[/?#]/);
  const authorityEnd = authorityEndOffset < 0
    ? value.length
    : authorityStart + authorityEndOffset;
  const authority = value.slice(authorityStart, authorityEnd);
  const hostAndPort = authority.slice(authority.lastIndexOf("@") + 1);
  return /:\d+$/.test(hostAndPort) || hostAndPort.endsWith(":");
}

function isIpv4Literal(hostname: string): boolean {
  const parts = hostname.split(".");
  return parts.length === 4 && parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const value = Number(part);
    return value >= 0 && value <= 255;
  });
}

function isUnsafeHostname(hostname: string): boolean {
  if (hostname.startsWith("[") || hostname.includes(":") || isIpv4Literal(hostname)) {
    return true;
  }
  if (!hostname.includes(".")) return true;
  return blockedHostnameSuffixes.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  );
}

function stripKnownEndpoint(pathname: string): string {
  const withoutTrailingSlash = pathname.replace(/\/+$/, "");
  return withoutTrailingSlash.replace(
    /\/(?:chat\/completions|responses|messages)$/i,
    "",
  );
}

export function normalizeCustomApiBaseUrl(value: unknown): string {
  if (typeof value !== "string") {
    throw new AiProviderConfigError("invalid_base_url", "API 地址必须是文本。");
  }
  const input = value.trim();
  if (!input || input.length > 300) {
    throw new AiProviderConfigError(
      "invalid_base_url",
      "API 地址长度必须在 1 到 300 个字符之间。",
    );
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new AiProviderConfigError("invalid_base_url", "API 地址不是有效 URL。");
  }
  if (url.protocol !== "https:") {
    throw new AiProviderConfigError("unsafe_base_url", "自定义 API 仅支持 HTTPS。");
  }
  if (url.username || url.password) {
    throw new AiProviderConfigError("unsafe_base_url", "API 地址不能包含用户名或密码。");
  }
  if (url.search || url.hash) {
    throw new AiProviderConfigError("unsafe_base_url", "API 地址不能包含查询参数或片段。");
  }
  if (url.port || hasExplicitPort(input)) {
    throw new AiProviderConfigError("unsafe_base_url", "API 地址不能使用显式端口。");
  }

  const hostname = url.hostname.toLocaleLowerCase("en-US").replace(/\.$/, "");
  if (isUnsafeHostname(hostname)) {
    throw new AiProviderConfigError(
      "unsafe_base_url",
      "API 地址必须使用公开域名，不能是内网名称或 IP 地址。",
    );
  }
  url.hostname = hostname;

  const stripped = stripKnownEndpoint(url.pathname);
  url.pathname = !stripped || stripped === "/" ? "/v1" : stripped;
  const normalized = url.toString().replace(/\/$/, "");
  if (normalized.length > 300) {
    throw new AiProviderConfigError("invalid_base_url", "规范化后的 API 地址过长。");
  }
  return normalized;
}

export function normalizeAiModel(value: unknown): string {
  if (typeof value !== "string") {
    throw new AiProviderConfigError("invalid_model", "模型名称必须是文本。");
  }
  const model = value.trim();
  if (!model || model.length > 160 || !/^[A-Za-z0-9._:+\/-]+$/.test(model)) {
    throw new AiProviderConfigError(
      "invalid_model",
      "模型名称只能包含字母、数字、点、横线、下划线、冒号、加号或斜线。",
    );
  }
  return model;
}

export function normalizeAiApiKey(value: unknown): string {
  if (typeof value !== "string") {
    throw new AiProviderConfigError("invalid_api_key", "API Key 必须是文本。");
  }
  const apiKey = value.trim();
  if (apiKey.length < 8 || apiKey.length > 512 || /\s/.test(apiKey)) {
    throw new AiProviderConfigError(
      "invalid_api_key",
      "API Key 长度必须在 8 到 512 个字符之间，且不能包含空白字符。",
    );
  }
  return apiKey;
}

export function resolveAiProvider(
  providerId: unknown,
  model: unknown,
  customBaseUrl?: unknown,
  customProtocol: unknown = "openai-chat",
): ResolvedAiProvider {
  if (!isAiProviderId(providerId)) {
    throw new AiProviderConfigError("invalid_provider", "不支持这个 AI 服务商。");
  }
  if (providerId === "custom") {
    if (!(
      customProtocol === "openai-chat"
      || customProtocol === "openai-responses"
      || customProtocol === "anthropic-messages"
    )) {
      throw new AiProviderConfigError(
        "invalid_provider",
        "自定义 API 支持 OpenAI Chat、Responses 或 Anthropic Messages 协议。",
      );
    }
    return {
      id: "custom",
      label: "自定义兼容 API",
      baseUrl: normalizeCustomApiBaseUrl(customBaseUrl),
      model: normalizeAiModel(model),
      protocol: customProtocol,
      vision: "model-dependent",
      webpageAnalysis: "snapshot-only",
      structuredOutput: "json-object",
      imageUrlShape: "object",
    };
  }
  const preset = getAiProviderPreset(providerId);
  return {
    id: preset.id,
    label: preset.label,
    baseUrl: preset.baseUrl,
    model: normalizeAiModel(model || preset.defaultModel),
    protocol: preset.protocol,
    vision: preset.vision,
    webpageAnalysis: preset.webpageAnalysis,
    structuredOutput: preset.structuredOutput,
    imageUrlShape: preset.imageUrlShape ?? "object",
    temperature: preset.temperature,
    maxImageDataUrlChars: preset.maxImageDataUrlChars,
    allowedImageMediaTypes: preset.allowedImageMediaTypes,
  };
}

export function providerEndpoint(provider: ResolvedAiProvider): string {
  const suffix = provider.protocol === "openai-responses"
    ? "/responses"
    : provider.protocol === "anthropic-messages"
      ? "/messages"
      : "/chat/completions";
  return `${provider.baseUrl.replace(/\/$/, "")}${suffix}`;
}

export function providerConnectionEndpoint(provider: ResolvedAiProvider): string {
  const baseUrl = provider.baseUrl.replace(/\/$/, "");
  if (provider.id === "openrouter") return `${baseUrl}/key`;
  if (provider.id === "siliconflow" || provider.id === "siliconflow-global") {
    return `${baseUrl}/models?type=text&sub_type=chat`;
  }
  return `${baseUrl}/models`;
}
