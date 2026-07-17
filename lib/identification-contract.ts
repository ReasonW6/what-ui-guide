export const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
export const MAX_WEBPAGE_URL_LENGTH = 2048;

export const screenshotMediaTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export type ScreenshotMediaType = (typeof screenshotMediaTypes)[number];
export type IdentificationStatus = "identified" | "ambiguous" | "unknown";
export type IdentificationConfidence = "high" | "medium" | "low";

export interface IdentificationCandidate {
  readonly slug: string;
  readonly confidence: IdentificationConfidence;
  readonly evidence: readonly string[];
  readonly distinction: string;
}

export interface IdentificationImplementation {
  readonly anatomy: readonly string[];
  readonly behavior: readonly string[];
  readonly styling: readonly string[];
  readonly accessibility: readonly string[];
}

export interface IdentificationResult {
  readonly status: IdentificationStatus;
  readonly summary: string;
  readonly candidates: readonly IdentificationCandidate[];
  readonly uncertainties: readonly string[];
  readonly implementation: IdentificationImplementation;
  readonly followUpQuestion: string | null;
}

export interface ValidatedScreenshotDataUrl {
  readonly dataUrl: string;
  readonly mediaType: ScreenshotMediaType;
  readonly byteLength: number;
}

export type IdentificationValidationCode =
  | "invalid_screenshot"
  | "screenshot_too_large"
  | "invalid_webpage_url"
  | "unsafe_webpage_url"
  | "invalid_identification_result";

export class IdentificationValidationError extends Error {
  readonly code: IdentificationValidationCode;

  constructor(code: IdentificationValidationCode, message: string) {
    super(message);
    this.name = "IdentificationValidationError";
    this.code = code;
  }
}

const MAX_RESULT_STRING_LENGTH = 1_200;
const MAX_GUIDANCE_STRING_LENGTH = 500;
const MAX_GUIDANCE_ITEMS = 5;
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
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationError(message: string): never {
  throw new IdentificationValidationError(
    "invalid_identification_result",
    message,
  );
}

function readBoundedString(
  value: unknown,
  path: string,
  maximum = MAX_GUIDANCE_STRING_LENGTH,
): string {
  if (typeof value !== "string") validationError(`${path} must be a string.`);
  const normalized = value.trim();
  if (!normalized) validationError(`${path} must not be empty.`);
  if (normalized.length > maximum) {
    validationError(`${path} must be at most ${maximum} characters.`);
  }
  return normalized;
}

function readBoundedStringArray(
  value: unknown,
  path: string,
  minimum = 0,
): string[] {
  if (!Array.isArray(value)) validationError(`${path} must be an array.`);
  if (value.length < minimum || value.length > MAX_GUIDANCE_ITEMS) {
    validationError(
      `${path} must contain between ${minimum} and ${MAX_GUIDANCE_ITEMS} items.`,
    );
  }
  return value.map((item, index) =>
    readBoundedString(item, `${path}[${index}]`),
  );
}

function uniqueAllowedSlugs(allowedSlugs: readonly string[]): string[] {
  const normalized = [...new Set(allowedSlugs.map((slug) => slug.trim()))]
    .filter(Boolean);
  if (!normalized.length) {
    throw new IdentificationValidationError(
      "invalid_identification_result",
      "At least one catalog slug is required.",
    );
  }
  return normalized;
}

function hasImageSignature(mediaType: ScreenshotMediaType, binary: string): boolean {
  const bytes = [...binary].map((character) => character.charCodeAt(0));
  switch (mediaType) {
    case "image/png":
      return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
        .every((byte, index) => bytes[index] === byte);
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/webp":
      return binary.startsWith("RIFF") && binary.slice(8, 12) === "WEBP";
    case "image/gif":
      return binary.startsWith("GIF87a") || binary.startsWith("GIF89a");
  }
}

function skipGifSubBlocks(bytes: Uint8Array, start: number): number | null {
  let index = start;
  while (index < bytes.length) {
    const size = bytes[index];
    index += 1;
    if (size === 0) return index;
    if (index + size > bytes.length) return null;
    index += size;
  }
  return null;
}

function countGifFrames(binary: string): number | null {
  if (binary.length < 14) return null;
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  let index = 13;
  const globalColorTablePacked = bytes[10];
  if ((globalColorTablePacked & 0x80) !== 0) {
    index += 3 * (2 ** ((globalColorTablePacked & 0x07) + 1));
  }

  let frames = 0;
  while (index < bytes.length) {
    const marker = bytes[index];
    index += 1;
    if (marker === 0x3b) return frames;

    if (marker === 0x21) {
      if (index >= bytes.length) return null;
      index += 1;
      const next = skipGifSubBlocks(bytes, index);
      if (next === null) return null;
      index = next;
      continue;
    }

    if (marker !== 0x2c || index + 9 > bytes.length) return null;
    frames += 1;
    if (frames > 1) return frames;

    const localColorTablePacked = bytes[index + 8];
    index += 9;
    if ((localColorTablePacked & 0x80) !== 0) {
      index += 3 * (2 ** ((localColorTablePacked & 0x07) + 1));
    }
    if (index >= bytes.length) return null;
    index += 1;
    const next = skipGifSubBlocks(bytes, index);
    if (next === null) return null;
    index = next;
  }
  return null;
}

export function validateScreenshotDataUrl(
  value: unknown,
): ValidatedScreenshotDataUrl {
  if (typeof value !== "string") {
    throw new IdentificationValidationError(
      "invalid_screenshot",
      "Screenshot must be a base64 data URL.",
    );
  }

  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    value,
  );
  if (!match) {
    throw new IdentificationValidationError(
      "invalid_screenshot",
      "Screenshot must be a PNG, JPEG, WebP, or GIF base64 data URL.",
    );
  }

  const mediaType = match[1] as ScreenshotMediaType;
  const base64 = match[2];
  if (base64.length % 4 !== 0) {
    throw new IdentificationValidationError(
      "invalid_screenshot",
      "Screenshot contains invalid base64 data.",
    );
  }

  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const byteLength = (base64.length / 4) * 3 - padding;
  if (byteLength > MAX_SCREENSHOT_BYTES) {
    throw new IdentificationValidationError(
      "screenshot_too_large",
      `Screenshot must be at most ${MAX_SCREENSHOT_BYTES} bytes.`,
    );
  }

  let signature: string;
  try {
    signature = atob(base64.slice(0, Math.min(24, base64.length)));
  } catch {
    throw new IdentificationValidationError(
      "invalid_screenshot",
      "Screenshot contains invalid base64 data.",
    );
  }
  if (!hasImageSignature(mediaType, signature)) {
    throw new IdentificationValidationError(
      "invalid_screenshot",
      "Screenshot bytes do not match its declared media type.",
    );
  }

  if (mediaType === "image/gif") {
    let gifBinary: string;
    try {
      gifBinary = atob(base64);
    } catch {
      throw new IdentificationValidationError(
        "invalid_screenshot",
        "Screenshot contains invalid base64 data.",
      );
    }
    const frames = countGifFrames(gifBinary);
    if (frames === null || frames === 0) {
      throw new IdentificationValidationError(
        "invalid_screenshot",
        "GIF screenshot data is incomplete or malformed.",
      );
    }
    if (frames > 1) {
      throw new IdentificationValidationError(
        "invalid_screenshot",
        "Animated GIF screenshots are not supported.",
      );
    }
  }

  return { dataUrl: value, mediaType, byteLength };
}

function hasExplicitPort(value: string): boolean {
  const schemeEnd = value.indexOf("://");
  if (schemeEnd < 0) return false;
  const authorityStart = schemeEnd + 3;
  const authorityEndCandidate = value.slice(authorityStart).search(/[/?#]/);
  const authorityEnd = authorityEndCandidate < 0
    ? value.length
    : authorityStart + authorityEndCandidate;
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

function isBlockedHostname(hostname: string): boolean {
  if (hostname.startsWith("[") || isIpv4Literal(hostname)) return true;
  if (!hostname.includes(".")) return true;
  return blockedHostnameSuffixes.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  );
}

export function normalizePublicWebpageUrl(value: unknown): string {
  if (typeof value !== "string") {
    throw new IdentificationValidationError(
      "invalid_webpage_url",
      "Webpage URL must be a string.",
    );
  }
  const input = value.trim();
  if (!input || input.length > MAX_WEBPAGE_URL_LENGTH) {
    throw new IdentificationValidationError(
      "invalid_webpage_url",
      `Webpage URL must be between 1 and ${MAX_WEBPAGE_URL_LENGTH} characters.`,
    );
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new IdentificationValidationError(
      "invalid_webpage_url",
      "Webpage URL is invalid.",
    );
  }

  if (url.protocol !== "https:") {
    throw new IdentificationValidationError(
      "unsafe_webpage_url",
      "Only HTTPS webpage URLs are allowed.",
    );
  }
  if (url.username || url.password) {
    throw new IdentificationValidationError(
      "unsafe_webpage_url",
      "Webpage URLs must not include user information.",
    );
  }
  if (url.port || hasExplicitPort(input)) {
    throw new IdentificationValidationError(
      "unsafe_webpage_url",
      "Webpage URLs must not include an explicit port.",
    );
  }

  const hostname = url.hostname.toLocaleLowerCase("en-US").replace(/\.$/, "");
  if (isBlockedHostname(hostname)) {
    throw new IdentificationValidationError(
      "unsafe_webpage_url",
      "Webpage URL must use a public hostname, not an internal name or IP literal.",
    );
  }

  url.hostname = hostname;
  url.hash = "";
  const normalized = url.toString();
  if (normalized.length > MAX_WEBPAGE_URL_LENGTH) {
    throw new IdentificationValidationError(
      "invalid_webpage_url",
      `Normalized webpage URL exceeds ${MAX_WEBPAGE_URL_LENGTH} characters.`,
    );
  }
  return normalized;
}

export function validateIdentificationResult(
  value: unknown,
  allowedSlugs: readonly string[],
): IdentificationResult {
  const allowed = new Set(uniqueAllowedSlugs(allowedSlugs));
  if (!isRecord(value)) validationError("Identification result must be an object.");

  if (!(["identified", "ambiguous", "unknown"] as const).includes(
    value.status as IdentificationStatus,
  )) {
    validationError("status must be identified, ambiguous, or unknown.");
  }
  const status = value.status as IdentificationStatus;
  const summary = readBoundedString(value.summary, "summary", MAX_RESULT_STRING_LENGTH);

  if (!Array.isArray(value.candidates) || value.candidates.length > 3) {
    validationError("candidates must contain at most 3 items.");
  }
  if (status !== "unknown" && value.candidates.length === 0) {
    validationError(`${status} results must include at least one candidate.`);
  }
  if (status === "unknown" && value.candidates.length !== 0) {
    validationError("unknown results must not include candidates.");
  }

  const seenSlugs = new Set<string>();
  const candidates = value.candidates.map((candidate, index) => {
    if (!isRecord(candidate)) validationError(`candidates[${index}] must be an object.`);
    const slug = readBoundedString(candidate.slug, `candidates[${index}].slug`, 120);
    if (!allowed.has(slug)) validationError(`Candidate slug ${slug} is not in the catalog.`);
    if (seenSlugs.has(slug)) validationError(`Candidate slug ${slug} is duplicated.`);
    seenSlugs.add(slug);

    if (!(["high", "medium", "low"] as const).includes(
      candidate.confidence as IdentificationConfidence,
    )) {
      validationError(`candidates[${index}].confidence is invalid.`);
    }
    return {
      slug,
      confidence: candidate.confidence as IdentificationConfidence,
      evidence: readBoundedStringArray(
        candidate.evidence,
        `candidates[${index}].evidence`,
        1,
      ),
      distinction: readBoundedString(
        candidate.distinction,
        `candidates[${index}].distinction`,
      ),
    };
  });

  const uncertainties = readBoundedStringArray(value.uncertainties, "uncertainties");
  if (!isRecord(value.implementation)) {
    validationError("implementation must be an object.");
  }
  const implementation = {
    anatomy: readBoundedStringArray(value.implementation.anatomy, "implementation.anatomy"),
    behavior: readBoundedStringArray(value.implementation.behavior, "implementation.behavior"),
    styling: readBoundedStringArray(value.implementation.styling, "implementation.styling"),
    accessibility: readBoundedStringArray(
      value.implementation.accessibility,
      "implementation.accessibility",
    ),
  };

  let followUpQuestion: string | null;
  if (value.followUpQuestion === null) {
    followUpQuestion = null;
  } else {
    followUpQuestion = readBoundedString(value.followUpQuestion, "followUpQuestion");
  }

  return {
    status,
    summary,
    candidates,
    uncertainties,
    implementation,
    followUpQuestion,
  };
}

const boundedGuidanceArraySchema = {
  type: "array",
  minItems: 0,
  maxItems: MAX_GUIDANCE_ITEMS,
  items: { type: "string", minLength: 1, maxLength: MAX_GUIDANCE_STRING_LENGTH },
} as const;

export function createIdentificationResultJsonSchema(
  allowedSlugs: readonly string[],
): Record<string, unknown> {
  const slugs = uniqueAllowedSlugs(allowedSlugs);
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      status: { type: "string", enum: ["identified", "ambiguous", "unknown"] },
      summary: { type: "string", minLength: 1, maxLength: MAX_RESULT_STRING_LENGTH },
      candidates: {
        type: "array",
        minItems: 0,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            slug: { type: "string", enum: slugs },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            evidence: {
              ...boundedGuidanceArraySchema,
              minItems: 1,
            },
            distinction: {
              type: "string",
              minLength: 1,
              maxLength: MAX_GUIDANCE_STRING_LENGTH,
            },
          },
          required: ["slug", "confidence", "evidence", "distinction"],
        },
      },
      uncertainties: boundedGuidanceArraySchema,
      implementation: {
        type: "object",
        additionalProperties: false,
        properties: {
          anatomy: boundedGuidanceArraySchema,
          behavior: boundedGuidanceArraySchema,
          styling: boundedGuidanceArraySchema,
          accessibility: boundedGuidanceArraySchema,
        },
        required: ["anatomy", "behavior", "styling", "accessibility"],
      },
      followUpQuestion: {
        anyOf: [
          { type: "string", minLength: 1, maxLength: MAX_GUIDANCE_STRING_LENGTH },
          { type: "null" },
        ],
      },
    },
    required: [
      "status",
      "summary",
      "candidates",
      "uncertainties",
      "implementation",
      "followUpQuestion",
    ],
  };
}

export const identificationResultJsonSchema = createIdentificationResultJsonSchema;
