import {
  createIdentificationResultJsonSchema,
  normalizePublicWebpageUrl,
  validateIdentificationResult,
  validateScreenshotDataUrl,
  type IdentificationResult,
} from "./identification-contract";

export const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";
export const DEFAULT_IDENTIFICATION_MODEL = "gpt-5.6-sol";

export interface ScreenshotIdentificationInput {
  readonly mode: "screenshot";
  readonly imageDataUrl: string;
  readonly description?: string;
}

export interface SemanticUrlSnapshotContext {
  readonly screenshotDataUrl?: string;
  readonly markdown?: string;
  readonly accessibilityTree?: unknown;
}

export interface SemanticUrlIdentificationInput {
  readonly mode: "semantic-url";
  readonly url: string;
  readonly description?: string;
  readonly snapshot?: SemanticUrlSnapshotContext;
}

export type OpenAIIdentificationInput =
  | ScreenshotIdentificationInput
  | SemanticUrlIdentificationInput;

export interface OpenAIIdentificationOptions {
  readonly apiKey: string;
  readonly allowedSlugs: readonly string[];
  readonly catalogKnowledge: string;
  readonly instructions: string;
  readonly input: OpenAIIdentificationInput;
  readonly model?: string;
  readonly endpoint?: string;
  readonly enableWebSearch?: boolean;
  readonly includeReasoning?: boolean;
  readonly signal?: AbortSignal;
  readonly fetchImpl?: typeof fetch;
}

export interface IdentificationSource {
  readonly title: string | null;
  readonly url: string;
}

export interface OpenAIIdentificationResponse {
  readonly result: IdentificationResult;
  readonly sources: readonly IdentificationSource[];
}

export type OpenAIIdentificationErrorCode =
  | "configuration"
  | "request"
  | "network"
  | "upstream"
  | "incomplete"
  | "refusal"
  | "invalid_response";

export class OpenAIIdentificationError extends Error {
  readonly code: OpenAIIdentificationErrorCode;
  readonly status: number | undefined;
  readonly retryable: boolean;

  constructor(
    code: OpenAIIdentificationErrorCode,
    message: string,
    options: { status?: number; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = "OpenAIIdentificationError";
    this.code = code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

const MAX_CONTEXT_CHARS = 30_000;
const MAX_ERROR_MESSAGE_CHARS = 500;
const MAX_UPSTREAM_RESPONSE_BYTES = 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 45_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNonEmpty(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new OpenAIIdentificationError(
      "configuration",
      `${name} is required.`,
    );
  }
  return normalized;
}

function clipText(value: string, maximum = MAX_CONTEXT_CHARS): string {
  if (value.length <= maximum) return value;
  return `${value.slice(0, maximum)}\n[content truncated]`;
}

function serializeContext(value: unknown): string {
  if (typeof value === "string") return clipText(value);
  try {
    return clipText(JSON.stringify(value));
  } catch {
    return "[accessibility tree could not be serialized]";
  }
}

function buildSystemInstructions(options: OpenAIIdentificationOptions): string {
  const callerInstructions = requireNonEmpty(options.instructions, "instructions");
  const catalogKnowledge = requireNonEmpty(
    options.catalogKnowledge,
    "catalogKnowledge",
  );
  return [
    callerInstructions,
    "Identify the visible UI/UX pattern using only catalog slugs supplied below.",
    "Use status unknown with no candidates when evidence is insufficient or unrelated.",
    "For identified or ambiguous results, include at least one and at most three unique candidates.",
    "Explain visual evidence and how each candidate differs from close alternatives.",
    "Return uncertainties explicitly. Give concise implementation anatomy, behavior, styling, and accessibility guidance.",
    "Do not claim interaction behavior that cannot be established from the supplied evidence; use followUpQuestion when one answer would resolve ambiguity.",
    `Catalog knowledge:\n${clipText(catalogKnowledge, 120_000)}`,
  ].join("\n\n");
}

function buildScreenshotContent(
  input: ScreenshotIdentificationInput,
): Array<Record<string, unknown>> {
  const screenshot = validateScreenshotDataUrl(input.imageDataUrl);
  const description = input.description?.trim();
  return [
    {
      type: "input_text",
      text: description
        ? `Identify the UI pattern in this screenshot. User context: ${clipText(description, 2_000)}`
        : "Identify the UI pattern in this screenshot.",
    },
    {
      type: "input_image",
      image_url: screenshot.dataUrl,
      detail: "high",
    },
  ];
}

function buildSemanticUrlContent(
  input: SemanticUrlIdentificationInput,
): {
  content: Array<Record<string, unknown>>;
  hostname: string;
} {
  const normalizedUrl = normalizePublicWebpageUrl(input.url);
  const hostname = new URL(normalizedUrl).hostname;
  const sections = [
    `Identify UI/UX patterns on this exact public webpage: ${normalizedUrl}`,
    "Use web search only to inspect semantic information from the allowed host. Do not infer content from unrelated domains.",
  ];
  if (input.description?.trim()) {
    sections.push(`User context: ${clipText(input.description.trim(), 2_000)}`);
  }
  if (input.snapshot?.markdown?.trim()) {
    sections.push(`Rendered page Markdown:\n${clipText(input.snapshot.markdown.trim())}`);
  }
  if (input.snapshot?.accessibilityTree !== undefined) {
    sections.push(
      `Rendered accessibility tree:\n${serializeContext(input.snapshot.accessibilityTree)}`,
    );
  }

  const content: Array<Record<string, unknown>> = [
    { type: "input_text", text: sections.join("\n\n") },
  ];
  if (input.snapshot?.screenshotDataUrl) {
    const screenshot = validateScreenshotDataUrl(input.snapshot.screenshotDataUrl);
    content.push({
      type: "input_image",
      image_url: screenshot.dataUrl,
      detail: "high",
    });
  }
  return { content, hostname };
}

export function createOpenAIIdentificationRequest(
  options: OpenAIIdentificationOptions,
): Record<string, unknown> {
  const model = options.model?.trim() || DEFAULT_IDENTIFICATION_MODEL;
  const schema = createIdentificationResultJsonSchema(options.allowedSlugs);
  const semantic = options.input.mode === "semantic-url"
    ? buildSemanticUrlContent(options.input)
    : null;
  const content = semantic
    ? semantic.content
    : buildScreenshotContent(options.input as ScreenshotIdentificationInput);

  return {
    model,
    ...(options.includeReasoning !== false
      ? { reasoning: { effort: "low" } }
      : {}),
    store: false,
    instructions: buildSystemInstructions(options),
    input: [{ role: "user", content }],
    text: {
      format: {
        type: "json_schema",
        name: "what_ui_identification",
        strict: true,
        schema,
      },
    },
    ...(semantic && options.enableWebSearch !== false
      ? {
          tools: [
            {
              type: "web_search",
              filters: { allowed_domains: [semantic.hostname] },
            },
          ],
          tool_choice: "auto",
        }
      : {}),
  };
}

export function boundedProviderSignal(parent?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
  return parent ? AbortSignal.any([parent, timeout]) : timeout;
}

export async function readBoundedResponseBody(response: Response): Promise<unknown> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && Number(declaredLength) > MAX_UPSTREAM_RESPONSE_BYTES) {
    throw new Error("Upstream response exceeded the allowed size.");
  }
  if (!response.body) return null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let received = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_UPSTREAM_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Upstream response exceeded the allowed size.");
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function readUpstreamMessage(body: unknown, fallback: string): string {
  let message = fallback;
  if (typeof body === "string" && body.trim()) {
    message = body.trim();
  } else if (isRecord(body)) {
    if (isRecord(body.error) && typeof body.error.message === "string") {
      message = body.error.message;
    } else if (typeof body.message === "string") {
      message = body.message;
    }
  }
  return message.slice(0, MAX_ERROR_MESSAGE_CHARS);
}

function findRefusal(body: unknown): string | null {
  if (!isRecord(body)) return null;
  if (typeof body.refusal === "string" && body.refusal.trim()) {
    return body.refusal.trim();
  }
  if (!Array.isArray(body.output)) return null;
  for (const output of body.output) {
    if (!isRecord(output) || !Array.isArray(output.content)) continue;
    for (const content of output.content) {
      if (
        isRecord(content)
        && content.type === "refusal"
        && typeof content.refusal === "string"
        && content.refusal.trim()
      ) {
        return content.refusal.trim();
      }
    }
  }
  return null;
}

function findStructuredOutput(body: unknown): unknown {
  if (!isRecord(body)) return undefined;
  if (body.output_parsed !== undefined) return body.output_parsed;
  if (typeof body.output_text === "string" && body.output_text.trim()) {
    return body.output_text;
  }
  if (!Array.isArray(body.output)) return undefined;

  const textParts: string[] = [];
  for (const output of body.output) {
    if (!isRecord(output) || !Array.isArray(output.content)) continue;
    for (const content of output.content) {
      if (!isRecord(content)) continue;
      if (content.parsed !== undefined) return content.parsed;
      if (
        content.type === "output_text"
        && typeof content.text === "string"
      ) {
        textParts.push(content.text);
      }
    }
  }
  return textParts.length ? textParts.join("") : undefined;
}

function findSources(body: unknown): IdentificationSource[] {
  if (!isRecord(body) || !Array.isArray(body.output)) return [];
  const sources: IdentificationSource[] = [];
  const seen = new Set<string>();
  for (const output of body.output) {
    if (!isRecord(output) || !Array.isArray(output.content)) continue;
    for (const content of output.content) {
      if (!isRecord(content) || !Array.isArray(content.annotations)) continue;
      for (const annotation of content.annotations) {
        if (
          !isRecord(annotation)
          || annotation.type !== "url_citation"
          || typeof annotation.url !== "string"
        ) {
          continue;
        }
        let url: string;
        try {
          url = normalizePublicWebpageUrl(annotation.url);
        } catch {
          continue;
        }
        if (seen.has(url)) continue;
        seen.add(url);
        sources.push({
          title: typeof annotation.title === "string" && annotation.title.trim()
            ? annotation.title.trim().slice(0, 300)
            : null,
          url,
        });
        if (sources.length === 10) return sources;
      }
    }
  }
  return sources;
}

function parseStructuredOutput(
  body: unknown,
  allowedSlugs: readonly string[],
): IdentificationResult {
  const refusal = findRefusal(body);
  if (refusal) {
    throw new OpenAIIdentificationError("refusal", refusal);
  }

  if (isRecord(body)) {
    if (body.error) {
      throw new OpenAIIdentificationError(
        "upstream",
        readUpstreamMessage(body, "OpenAI returned an error."),
        { retryable: true },
      );
    }
    if (typeof body.status === "string" && body.status !== "completed") {
      const details = isRecord(body.incomplete_details)
        && typeof body.incomplete_details.reason === "string"
        ? `: ${body.incomplete_details.reason}`
        : "";
      throw new OpenAIIdentificationError(
        "incomplete",
        `OpenAI response was ${body.status}${details}.`,
        { retryable: body.status === "incomplete" },
      );
    }
  }

  const output = findStructuredOutput(body);
  if (output === undefined) {
    throw new OpenAIIdentificationError(
      "invalid_response",
      "OpenAI response did not contain structured output.",
    );
  }

  let parsed = output;
  if (typeof output === "string") {
    try {
      parsed = JSON.parse(output);
    } catch {
      throw new OpenAIIdentificationError(
        "invalid_response",
        "OpenAI structured output was not valid JSON.",
      );
    }
  }

  try {
    return validateIdentificationResult(parsed, allowedSlugs);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "validation failed";
    throw new OpenAIIdentificationError(
      "invalid_response",
      `OpenAI structured output failed validation: ${detail}`,
    );
  }
}

export async function identifyWithOpenAI(
  options: OpenAIIdentificationOptions,
): Promise<OpenAIIdentificationResponse> {
  const apiKey = requireNonEmpty(options.apiKey, "apiKey");
  const request = createOpenAIIdentificationRequest(options);
  const fetchImpl = options.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await fetchImpl(options.endpoint ?? OPENAI_RESPONSES_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
      redirect: "error",
      signal: boundedProviderSignal(options.signal),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "network request failed";
    throw new OpenAIIdentificationError(
      "network",
      `OpenAI request failed: ${detail}`,
      { retryable: true },
    );
  }

  let body: unknown;
  try {
    body = await readBoundedResponseBody(response);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "response read failed";
    throw new OpenAIIdentificationError(
      "upstream",
      `Could not read OpenAI response: ${detail}`,
      { status: response.status, retryable: response.status >= 500 },
    );
  }

  if (!response.ok) {
    throw new OpenAIIdentificationError(
      "upstream",
      readUpstreamMessage(body, `OpenAI request failed with HTTP ${response.status}.`),
      {
        status: response.status,
        retryable: response.status === 408
          || response.status === 409
          || response.status === 429
          || response.status >= 500,
      },
    );
  }

  return {
    result: parseStructuredOutput(body, options.allowedSlugs),
    sources: findSources(body),
  };
}
