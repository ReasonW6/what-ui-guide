import {
  IdentificationValidationError,
  MAX_NORMALIZED_SCREENSHOT_SIDE,
  normalizePublicWebpageUrl,
  validateScreenshotDataUrl,
} from "./identification-contract";

export const SNAPSHOT_FORMATS = [
  "screenshot",
  "markdown",
  "accessibilityTree",
] as const;

export interface BrowserSnapshotPayload {
  readonly url: string;
  readonly formats: typeof SNAPSHOT_FORMATS;
  readonly allowRequestPattern: string[];
  readonly viewport: {
    readonly width: number;
    readonly height: number;
  };
  readonly gotoOptions: {
    readonly timeout: number;
    readonly waitUntil: "networkidle2";
  };
  readonly actionTimeout: number;
  readonly cacheTTL: 0;
  readonly screenshotOptions: {
    readonly type: "png";
    readonly fullPage: false;
  };
}

export interface BrowserRunBinding {
  quickAction(
    action: "snapshot",
    payload: BrowserSnapshotPayload,
  ): Promise<Response | unknown>;
}

export interface WebpageCaptureEnvironment {
  readonly BROWSER?: BrowserRunBinding;
  readonly BROWSER_ALLOWED_HOSTS?: string;
  readonly BROWSER_ACCOUNT_ID?: string;
  readonly BROWSER_API_TOKEN?: string;
  readonly CLOUDFLARE_ACCOUNT_ID?: string;
  readonly CLOUDFLARE_API_TOKEN?: string;
}

export interface WebpageCaptureOptions {
  readonly url: string;
  readonly env: WebpageCaptureEnvironment;
  readonly fetchImpl?: typeof fetch;
  readonly viewport?: {
    readonly width?: number;
    readonly height?: number;
  };
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}

export interface WebpageCaptureDiagnostics {
  readonly requestedHostname: string;
  readonly requestPolicy: "same-origin-only";
  readonly pageStatus: number | null;
  readonly pageTitle: string | null;
  readonly browserMsUsed: number | null;
}

export interface CapturedWebpageSnapshot {
  readonly url: string;
  readonly screenshotDataUrl: string;
  readonly markdown: string;
  readonly accessibilityTree: string;
  readonly source: "binding" | "rest";
  readonly diagnostics: WebpageCaptureDiagnostics;
}

export type WebpageCaptureWarningCode =
  | "invalid_url"
  | "host_not_allowed"
  | "binding_failed"
  | "rest_failed"
  | "invalid_response";

export interface WebpageCaptureWarning {
  readonly code: WebpageCaptureWarningCode;
  readonly message: string;
  readonly retryable: boolean;
}

export type WebpageCaptureResult =
  | { readonly ok: true; readonly snapshot: CapturedWebpageSnapshot }
  | { readonly ok: false; readonly warning: WebpageCaptureWarning };

const CLOUDFLARE_API_ORIGIN = "https://api.cloudflare.com";
const MAX_CAPTURE_TEXT_CHARS = 50_000;
const MAX_CAPTURE_RESPONSE_BYTES = 12 * 1024 * 1024;
const DEFAULT_WIDTH = MAX_NORMALIZED_SCREENSHOT_SIDE;
const DEFAULT_HEIGHT = 900;
const DEFAULT_TIMEOUT_MS = 20_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(value as number)));
}

function clipText(value: string): string {
  if (value.length <= MAX_CAPTURE_TEXT_CHARS) return value;
  return `${value.slice(0, MAX_CAPTURE_TEXT_CHARS)}\n[content truncated]`;
}

function parseAllowedHosts(value: string | undefined): Set<string> {
  const hosts = (value ?? "")
    .split(/[\s,]+/)
    .map((host) => host.trim().toLocaleLowerCase("en-US").replace(/\.$/, ""))
    .filter((host) => /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host));
  return new Set(hosts);
}

function sameOriginRequestPattern(url: string): string {
  const origin = new URL(url).origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `^${origin}(?:/|$)`;
}

function warning(
  code: WebpageCaptureWarningCode,
  message: string,
  retryable = false,
): WebpageCaptureResult {
  return { ok: false, warning: { code, message, retryable } };
}

function makePayload(
  url: string,
  options: WebpageCaptureOptions,
): BrowserSnapshotPayload {
  const width = boundedInteger(
    options.viewport?.width,
    DEFAULT_WIDTH,
    320,
    MAX_NORMALIZED_SCREENSHOT_SIDE,
  );
  const height = boundedInteger(
    options.viewport?.height,
    DEFAULT_HEIGHT,
    240,
    MAX_NORMALIZED_SCREENSHOT_SIDE,
  );
  const timeout = boundedInteger(
    options.timeoutMs,
    DEFAULT_TIMEOUT_MS,
    1_000,
    30_000,
  );
  return {
    url,
    formats: SNAPSHOT_FORMATS,
    allowRequestPattern: [sameOriginRequestPattern(url)],
    viewport: { width, height },
    gotoOptions: { timeout, waitUntil: "networkidle2" },
    actionTimeout: timeout,
    cacheTTL: 0,
    screenshotOptions: {
      type: "png",
      fullPage: false,
    },
  };
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException("Browser capture was aborted.", "AbortError");
}

function waitForSignal<T>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortReason(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

async function readBody(
  response: Response,
  signal?: AbortSignal,
): Promise<unknown> {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null
    && Number(declaredLength) > MAX_CAPTURE_RESPONSE_BYTES
  ) {
    await response.body?.cancel().catch(() => {});
    throw new Error("Snapshot response exceeded the allowed size.");
  }
  if (!response.body) return null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let received = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await waitForSignal(reader.read(), signal);
      if (done) break;
      received += value.byteLength;
      if (received > MAX_CAPTURE_RESPONSE_BYTES) {
        throw new Error("Snapshot response exceeded the allowed size.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    await reader.cancel(error).catch(() => {});
    throw error;
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, 500);
  if (!isRecord(value)) return fallback;
  if (Array.isArray(value.errors)) {
    const messages = value.errors
      .filter(isRecord)
      .map((error) => typeof error.message === "string" ? error.message.trim() : "")
      .filter(Boolean);
    if (messages.length) return messages.join("; ").slice(0, 500);
  }
  if (typeof value.message === "string" && value.message.trim()) {
    return value.message.trim().slice(0, 500);
  }
  return fallback;
}

async function screenshotDataUrl(value: string): Promise<string> {
  if (value.startsWith("data:")) return (await validateScreenshotDataUrl(value)).dataUrl;
  for (const mediaType of ["image/jpeg", "image/png", "image/webp", "image/gif"] as const) {
    const candidate = `data:${mediaType};base64,${value}`;
    try {
      return (await validateScreenshotDataUrl(candidate)).dataUrl;
    } catch {
      // Try the next supported signature.
    }
  }
  throw new Error("Snapshot screenshot is not a supported base64 image.");
}

async function extractSnapshot(
  value: unknown,
  url: string,
  source: CapturedWebpageSnapshot["source"],
  browserMsUsed: number | null,
): Promise<CapturedWebpageSnapshot> {
  if (!isRecord(value)) throw new Error("Snapshot response was not an object.");
  if (value.success === false) {
    throw new Error(errorMessage(value, "Snapshot request was unsuccessful."));
  }
  const result = isRecord(value.result) ? value.result : value;
  const meta = isRecord(value.meta) ? value.meta : null;
  if (typeof result.screenshot !== "string" || !result.screenshot.trim()) {
    throw new Error("Snapshot response did not include a screenshot.");
  }
  if (typeof result.markdown !== "string") {
    throw new Error("Snapshot response did not include Markdown.");
  }
  if (result.accessibilityTree === undefined) {
    throw new Error("Snapshot response did not include an accessibility tree.");
  }

  let accessibilityTree: string;
  try {
    accessibilityTree = typeof result.accessibilityTree === "string"
      ? result.accessibilityTree
      : JSON.stringify(result.accessibilityTree);
  } catch {
    throw new Error("Snapshot accessibility tree could not be serialized.");
  }

  return {
    url,
    screenshotDataUrl: await screenshotDataUrl(result.screenshot.trim()),
    markdown: clipText(result.markdown),
    accessibilityTree: clipText(accessibilityTree),
    source,
    diagnostics: {
      requestedHostname: new URL(url).hostname,
      requestPolicy: "same-origin-only",
      pageStatus: meta && typeof meta.status === "number" ? meta.status : null,
      pageTitle: meta && typeof meta.title === "string"
        ? meta.title.trim().slice(0, 300) || null
        : null,
      browserMsUsed,
    },
  };
}

function readBrowserMsUsed(response: Response): number | null {
  const header = response.headers.get("x-browser-ms-used");
  if (header === null || !header.trim()) return null;
  const value = Number(header);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

async function captureWithBinding(
  binding: BrowserRunBinding,
  payload: BrowserSnapshotPayload,
  signal?: AbortSignal,
): Promise<CapturedWebpageSnapshot> {
  const response = await waitForSignal(
    binding.quickAction("snapshot", payload),
    signal,
  );
  if (response instanceof Response) {
    const body = await readBody(response, signal);
    if (!response.ok) {
      throw new Error(
        errorMessage(body, `Browser binding failed with HTTP ${response.status}.`),
      );
    }
    return extractSnapshot(
      body,
      payload.url,
      "binding",
      readBrowserMsUsed(response),
    );
  }
  return extractSnapshot(response, payload.url, "binding", null);
}

async function captureWithRest(
  options: WebpageCaptureOptions,
  payload: BrowserSnapshotPayload,
  accountId: string,
  apiToken: string,
): Promise<CapturedWebpageSnapshot> {
  const endpoint = new URL(
    `/client/v4/accounts/${encodeURIComponent(accountId)}/browser-rendering/snapshot`,
    CLOUDFLARE_API_ORIGIN,
  );
  endpoint.searchParams.set("cacheTTL", "0");

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    payload.actionTimeout + 2_000,
  );
  const { cacheTTL, ...restPayload } = payload;
  void cacheTTL;
  const signal = options.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;
  try {
    const response = await (options.fetchImpl ?? fetch)(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(restPayload),
      signal,
    });

    const body = await readBody(response, signal);
    if (!response.ok) {
      throw new Error(
        errorMessage(body, `Browser REST API failed with HTTP ${response.status}.`),
      );
    }
    return extractSnapshot(
      body,
      payload.url,
      "rest",
      readBrowserMsUsed(response),
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function captureWebpageSnapshot(
  options: WebpageCaptureOptions,
): Promise<WebpageCaptureResult | null> {
  let url: string;
  try {
    url = normalizePublicWebpageUrl(options.url);
  } catch (error) {
    const message = error instanceof IdentificationValidationError
      ? error.message
      : "Webpage URL is invalid.";
    return warning("invalid_url", message);
  }

  const hostname = new URL(url).hostname.toLocaleLowerCase("en-US");
  const allowedHosts = parseAllowedHosts(options.env.BROWSER_ALLOWED_HOSTS);
  if (!allowedHosts.has(hostname)) {
    return warning(
      "host_not_allowed",
      `Browser capture is not enabled for ${hostname}.`,
    );
  }

  const payload = makePayload(url, options);
  let bindingFailure: Error | null = null;
  if (options.env.BROWSER) {
    try {
      const snapshot = await captureWithBinding(
        options.env.BROWSER,
        payload,
        options.signal,
      );
      return { ok: true, snapshot };
    } catch (error) {
      bindingFailure = error instanceof Error
        ? error
        : new Error("Browser binding failed.");
    }
    if (options.signal?.aborted) {
      return warning("binding_failed", bindingFailure.message, true);
    }
  }

  const accountId = (
    options.env.BROWSER_ACCOUNT_ID
    ?? options.env.CLOUDFLARE_ACCOUNT_ID
    ?? ""
  ).trim();
  const apiToken = (
    options.env.BROWSER_API_TOKEN
    ?? options.env.CLOUDFLARE_API_TOKEN
    ?? ""
  ).trim();

  if (accountId && apiToken) {
    try {
      const snapshot = await captureWithRest(
        options,
        payload,
        accountId,
        apiToken,
      );
      return { ok: true, snapshot };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Browser REST API failed.";
      return warning("rest_failed", detail, true);
    }
  }

  if (bindingFailure) {
    return warning("binding_failed", bindingFailure.message, true);
  }
  return null;
}
