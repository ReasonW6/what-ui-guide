export const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
export const MAX_SCREENSHOT_SIDE = 8_192;
export const MAX_SCREENSHOT_PIXELS = 16_000_000;
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
  readonly implementation: IdentificationImplementation;
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

function hasImageSignature(mediaType: ScreenshotMediaType, bytes: Uint8Array): boolean {
  switch (mediaType) {
    case "image/png":
      return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
        .every((byte, index) => bytes[index] === byte);
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/webp":
      return readAscii(bytes, 0, 4) === "RIFF" && readAscii(bytes, 8, 4) === "WEBP";
    case "image/gif":
      return readAscii(bytes, 0, 6) === "GIF87a" || readAscii(bytes, 0, 6) === "GIF89a";
  }
}

interface ScreenshotDimensions {
  readonly width: number;
  readonly height: number;
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function readUint16BigEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset] * 0x100 + bytes[offset + 1];
}

function readUint16LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset] + bytes[offset + 1] * 0x100;
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset] + bytes[offset + 1] * 0x100 + bytes[offset + 2] * 0x1_0000;
}

function readUint32BigEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset] * 0x1_000000
    + bytes[offset + 1] * 0x1_0000
    + bytes[offset + 2] * 0x100
    + bytes[offset + 3];
}

function readUint32LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset]
    + bytes[offset + 1] * 0x100
    + bytes[offset + 2] * 0x1_0000
    + bytes[offset + 3] * 0x1_000000;
}

function inspectPngDimensions(bytes: Uint8Array): ScreenshotDimensions | null {
  if (
    bytes.length < 24
    || readUint32BigEndian(bytes, 8) !== 13
    || readAscii(bytes, 12, 4) !== "IHDR"
  ) {
    return null;
  }
  const width = readUint32BigEndian(bytes, 16);
  const height = readUint32BigEndian(bytes, 20);
  return width > 0 && height > 0 ? { width, height } : null;
}

const jpegStartOfFrameMarkers = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function inspectJpegDimensions(bytes: Uint8Array): ScreenshotDimensions | null {
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return null;

    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda || marker === 0x00) return null;
    if (marker === 0x01 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    if (offset + 2 > bytes.length) return null;

    const segmentLength = readUint16BigEndian(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (jpegStartOfFrameMarkers.has(marker)) {
      if (segmentLength < 8) return null;
      const height = readUint16BigEndian(bytes, offset + 3);
      const width = readUint16BigEndian(bytes, offset + 5);
      return width > 0 && height > 0 ? { width, height } : null;
    }
    offset += segmentLength;
  }
  return null;
}

function inspectWebpDimensions(bytes: Uint8Array): readonly ScreenshotDimensions[] | null {
  if (bytes.length < 20) return null;
  const declaredEnd = 8 + readUint32LittleEndian(bytes, 4);
  if (declaredEnd < 20 || declaredEnd > bytes.length) return null;

  const dimensions: ScreenshotDimensions[] = [];
  let offset = 12;
  while (offset + 8 <= declaredEnd) {
    const format = readAscii(bytes, offset, 4);
    const chunkLength = readUint32LittleEndian(bytes, offset + 4);
    const dataOffset = offset + 8;
    const chunkEnd = dataOffset + chunkLength;
    if (chunkEnd > declaredEnd) return null;

    if (format === "VP8X") {
      if (chunkLength < 10) return null;
      dimensions.push({
        width: 1 + readUint24LittleEndian(bytes, dataOffset + 4),
        height: 1 + readUint24LittleEndian(bytes, dataOffset + 7),
      });
    } else if (format === "VP8 ") {
      if (
        chunkLength < 10
        || bytes[dataOffset + 3] !== 0x9d
        || bytes[dataOffset + 4] !== 0x01
        || bytes[dataOffset + 5] !== 0x2a
      ) {
        return null;
      }
      dimensions.push({
        width: readUint16LittleEndian(bytes, dataOffset + 6) & 0x3fff,
        height: readUint16LittleEndian(bytes, dataOffset + 8) & 0x3fff,
      });
    } else if (format === "VP8L") {
      if (chunkLength < 5 || bytes[dataOffset] !== 0x2f) return null;
      dimensions.push({
        width: 1 + bytes[dataOffset + 1] + ((bytes[dataOffset + 2] & 0x3f) << 8),
        height: 1
          + ((bytes[dataOffset + 2] & 0xc0) >> 6)
          + (bytes[dataOffset + 3] << 2)
          + ((bytes[dataOffset + 4] & 0x0f) << 10),
      });
    }

    offset = chunkEnd + (chunkLength % 2);
  }
  return dimensions.length > 0 ? dimensions : null;
}

function inspectStillScreenshotDimensions(
  mediaType: Exclude<ScreenshotMediaType, "image/gif">,
  bytes: Uint8Array,
): readonly ScreenshotDimensions[] | null {
  if (mediaType === "image/webp") return inspectWebpDimensions(bytes);
  const dimensions = mediaType === "image/png"
    ? inspectPngDimensions(bytes)
    : inspectJpegDimensions(bytes);
  return dimensions === null ? null : [dimensions];
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

export function screenshotDimensionsWithinBudget(width: number, height: number): boolean {
  return (
    width >= 1
    && height >= 1
    && width <= MAX_SCREENSHOT_SIDE
    && height <= MAX_SCREENSHOT_SIDE
    && width * height <= MAX_SCREENSHOT_PIXELS
  );
}

export interface GifScreenshotInspection {
  readonly dimensionsWithinBudget: boolean;
  readonly frameCount: number;
}

export function inspectGifScreenshot(bytes: Uint8Array): GifScreenshotInspection | null {
  if (bytes.length < 14) return null;
  const signature = String.fromCharCode(...bytes.slice(0, 6));
  if (signature !== "GIF87a" && signature !== "GIF89a") return null;
  const readUint16 = (offset: number) => bytes[offset] | (bytes[offset + 1] << 8);
  const logicalWidth = readUint16(6);
  const logicalHeight = readUint16(8);
  if (logicalWidth === 0 || logicalHeight === 0) return null;

  let index = 13;
  const globalColorTablePacked = bytes[10];
  if ((globalColorTablePacked & 0x80) !== 0) {
    index += 3 * (2 ** ((globalColorTablePacked & 0x07) + 1));
  }

  let frames = 0;
  let dimensionsWithinBudget = screenshotDimensionsWithinBudget(
    logicalWidth,
    logicalHeight,
  );
  while (index < bytes.length) {
    const marker = bytes[index];
    index += 1;
    if (marker === 0x3b) {
      return { dimensionsWithinBudget, frameCount: frames };
    }

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
    const frameWidth = readUint16(index + 4);
    const frameHeight = readUint16(index + 6);
    if (frameWidth === 0 || frameHeight === 0) return null;
    dimensionsWithinBudget &&= screenshotDimensionsWithinBudget(
      frameWidth,
      frameHeight,
    );

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

  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new IdentificationValidationError(
      "invalid_screenshot",
      "Screenshot contains invalid base64 data.",
    );
  }
  const bytes = Uint8Array.from(
    binary,
    (character) => character.charCodeAt(0),
  );
  if (!hasImageSignature(mediaType, bytes)) {
    throw new IdentificationValidationError(
      "invalid_screenshot",
      "Screenshot bytes do not match its declared media type.",
    );
  }

  if (mediaType === "image/gif") {
    const inspection = inspectGifScreenshot(bytes);
    if (inspection === null || inspection.frameCount === 0) {
      throw new IdentificationValidationError(
        "invalid_screenshot",
        "GIF screenshot data is incomplete or malformed.",
      );
    }
    if (!inspection.dimensionsWithinBudget) {
      throw new IdentificationValidationError(
        "screenshot_too_large",
        `GIF screenshot dimensions must not exceed ${MAX_SCREENSHOT_SIDE} px per side or ${MAX_SCREENSHOT_PIXELS} total pixels.`,
      );
    }
    if (inspection.frameCount > 1) {
      throw new IdentificationValidationError(
        "invalid_screenshot",
        "Animated GIF screenshots are not supported.",
      );
    }
  } else {
    const dimensions = inspectStillScreenshotDimensions(mediaType, bytes);
    if (dimensions === null) {
      throw new IdentificationValidationError(
        "invalid_screenshot",
        "Screenshot dimensions are incomplete or malformed.",
      );
    }
    if (dimensions.some(
      (item) => !screenshotDimensionsWithinBudget(item.width, item.height),
    )) {
      throw new IdentificationValidationError(
        "screenshot_too_large",
        `Screenshot dimensions must not exceed ${MAX_SCREENSHOT_SIDE} px per side or ${MAX_SCREENSHOT_PIXELS} total pixels.`,
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
  if ("implementation" in value) {
    validationError(
      "Top-level implementation is not supported; each candidate must define its own implementation.",
    );
  }

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
    if (!isRecord(candidate.implementation)) {
      validationError(`candidates[${index}].implementation must be an object.`);
    }
    const implementationPath = `candidates[${index}].implementation`;

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
      implementation: {
        anatomy: readBoundedStringArray(
          candidate.implementation.anatomy,
          `${implementationPath}.anatomy`,
        ),
        behavior: readBoundedStringArray(
          candidate.implementation.behavior,
          `${implementationPath}.behavior`,
        ),
        styling: readBoundedStringArray(
          candidate.implementation.styling,
          `${implementationPath}.styling`,
        ),
        accessibility: readBoundedStringArray(
          candidate.implementation.accessibility,
          `${implementationPath}.accessibility`,
        ),
      },
    };
  });

  const uncertainties = readBoundedStringArray(value.uncertainties, "uncertainties");

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
          },
          required: [
            "slug",
            "confidence",
            "evidence",
            "distinction",
            "implementation",
          ],
        },
      },
      uncertainties: boundedGuidanceArraySchema,
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
      "followUpQuestion",
    ],
  };
}

export const identificationResultJsonSchema = createIdentificationResultJsonSchema;
