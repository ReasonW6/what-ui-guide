export const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
export const MAX_SCREENSHOT_SIDE = 8_192;
export const MAX_SCREENSHOT_PIXELS = 16_000_000;
export const MAX_NORMALIZED_SCREENSHOT_SIDE = 1_360;
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
  readonly width: number;
  readonly height: number;
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

export interface ScreenshotDimensions {
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

const pngCrc32Table = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc >>> 1) ^ ((crc & 1) !== 0 ? 0xedb8_8320 : 0);
  }
  return crc >>> 0;
});

function pngCrc32(bytes: Uint8Array, start: number, end: number): number {
  let crc = 0xffff_ffff;
  for (let index = start; index < end; index += 1) {
    crc = pngCrc32Table[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffff_ffff) >>> 0;
}

function pngExpectedRowBytes(
  width: number,
  height: number,
  bitDepth: number,
  colorType: number,
  interlace: number,
): number[] {
  const channelsByColorType: Readonly<Record<number, number>> = {
    0: 1,
    2: 3,
    3: 1,
    4: 2,
    6: 4,
  };
  const bitsPerPixel = bitDepth * channelsByColorType[colorType];
  const rows: number[] = [];
  const addPass = (
    startX: number,
    startY: number,
    stepX: number,
    stepY: number,
  ) => {
    if (width <= startX || height <= startY) return;
    const passWidth = Math.ceil((width - startX) / stepX);
    const passHeight = Math.ceil((height - startY) / stepY);
    const rowBytes = Math.ceil((passWidth * bitsPerPixel) / 8);
    for (let row = 0; row < passHeight; row += 1) rows.push(rowBytes);
  };

  if (interlace === 0) {
    addPass(0, 0, 1, 1);
  } else {
    addPass(0, 0, 8, 8);
    addPass(4, 0, 8, 8);
    addPass(0, 4, 4, 8);
    addPass(2, 0, 4, 4);
    addPass(0, 2, 2, 4);
    addPass(1, 0, 2, 2);
    addPass(0, 1, 1, 2);
  }
  return rows;
}

async function validatePngImageData(
  compressed: Uint8Array<ArrayBuffer>,
  dimensions: ScreenshotDimensions,
  bitDepth: number,
  colorType: number,
  interlace: number,
): Promise<boolean> {
  const expectedRowBytes = pngExpectedRowBytes(
    dimensions.width,
    dimensions.height,
    bitDepth,
    colorType,
    interlace,
  );
  const expectedBytes = expectedRowBytes.reduce(
    (total, rowBytes) => total + rowBytes + 1,
    0,
  );
  const compressedStream = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(compressed);
      controller.close();
    },
  });
  const reader = compressedStream
    .pipeThrough(new DecompressionStream("deflate"))
    .getReader();

  try {
    let outputBytes = 0;
    let rowIndex = 0;
    let nextFilterOffset = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkEnd = outputBytes + value.byteLength;
      if (chunkEnd > expectedBytes) {
        await reader.cancel();
        return false;
      }

      while (
        rowIndex < expectedRowBytes.length
        && nextFilterOffset < chunkEnd
      ) {
        if (value[nextFilterOffset - outputBytes] > 4) {
          await reader.cancel();
          return false;
        }
        nextFilterOffset += expectedRowBytes[rowIndex] + 1;
        rowIndex += 1;
      }
      outputBytes = chunkEnd;
    }
    return (
      outputBytes === expectedBytes
      && rowIndex === expectedRowBytes.length
      && nextFilterOffset === expectedBytes
    );
  } catch {
    return false;
  } finally {
    reader.releaseLock();
  }
}

function validPngHeader(bytes: Uint8Array, dataOffset: number): boolean {
  const bitDepth = bytes[dataOffset + 8];
  const colorType = bytes[dataOffset + 9];
  const allowedBitDepths: Readonly<Record<number, readonly number[]>> = {
    0: [1, 2, 4, 8, 16],
    2: [8, 16],
    3: [1, 2, 4, 8],
    4: [8, 16],
    6: [8, 16],
  };
  return (
    allowedBitDepths[colorType]?.includes(bitDepth) === true
    && bytes[dataOffset + 10] === 0
    && bytes[dataOffset + 11] === 0
    && (bytes[dataOffset + 12] === 0 || bytes[dataOffset + 12] === 1)
  );
}

async function inspectPngDimensions(
  bytes: Uint8Array,
): Promise<ScreenshotDimensions | null> {
  let offset = 8;
  let dimensions: ScreenshotDimensions | null = null;
  let sawImageData = false;
  let endedImageData = false;
  let sawPalette = false;
  let paletteEntries = 0;
  let colorType = -1;
  let bitDepth = -1;
  let interlace = -1;
  const imageDataChunks: Uint8Array[] = [];
  let imageDataBytes = 0;

  while (offset + 12 <= bytes.length) {
    const chunkLength = readUint32BigEndian(bytes, offset);
    const typeOffset = offset + 4;
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + chunkLength;
    const chunkEnd = dataEnd + 4;
    if (dataEnd < dataOffset || chunkEnd > bytes.length) return null;

    const chunkType = readAscii(bytes, typeOffset, 4);
    if (!/^[A-Za-z]{4}$/.test(chunkType)) return null;
    if (
      pngCrc32(bytes, typeOffset, dataEnd)
      !== readUint32BigEndian(bytes, dataEnd)
    ) {
      return null;
    }

    if (dimensions === null) {
      if (
        chunkType !== "IHDR"
        || chunkLength !== 13
        || !validPngHeader(bytes, dataOffset)
      ) {
        return null;
      }
      const width = readUint32BigEndian(bytes, dataOffset);
      const height = readUint32BigEndian(bytes, dataOffset + 4);
      if (width === 0 || height === 0) return null;
      dimensions = { width, height };
      bitDepth = bytes[dataOffset + 8];
      colorType = bytes[dataOffset + 9];
      interlace = bytes[dataOffset + 12];
    } else if (chunkType === "IHDR") {
      return null;
    }

    if (chunkType === "PLTE") {
      if (
        sawPalette
        || sawImageData
        || chunkLength === 0
        || chunkLength > 768
        || chunkLength % 3 !== 0
      ) {
        return null;
      }
      sawPalette = true;
      paletteEntries = chunkLength / 3;
    } else if (chunkType === "IDAT") {
      if (endedImageData) return null;
      sawImageData = true;
      imageDataChunks.push(bytes.subarray(dataOffset, dataEnd));
      imageDataBytes += chunkLength;
    } else if (sawImageData && chunkType !== "IEND") {
      endedImageData = true;
    }

    if (
      chunkType !== "IHDR"
      && chunkType !== "PLTE"
      && chunkType !== "IDAT"
      && chunkType !== "IEND"
      && chunkType[0] === chunkType[0].toUpperCase()
    ) {
      return null;
    }
    if (chunkType === "IEND") {
      if (
        chunkLength !== 0
        || !sawImageData
        || (colorType === 3 && !sawPalette)
        || ((colorType === 0 || colorType === 4) && sawPalette)
        || chunkEnd !== bytes.length
      ) {
        return null;
      }
      if (colorType === 3 && paletteEntries > 2 ** bitDepth) return null;
      if (screenshotDimensionsWithinBudget(dimensions.width, dimensions.height)) {
        const compressed = new Uint8Array(imageDataBytes);
        let compressedOffset = 0;
        for (const chunk of imageDataChunks) {
          compressed.set(chunk, compressedOffset);
          compressedOffset += chunk.length;
        }
        if (!(await validatePngImageData(
          compressed,
          dimensions,
          bitDepth,
          colorType,
          interlace,
        ))) {
          return null;
        }
      }
      return dimensions;
    }
    offset = chunkEnd;
  }
  return null;
}

const jpegStartOfFrameMarkers = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function inspectJpegDimensions(bytes: Uint8Array): ScreenshotDimensions | null {
  if (
    bytes.length < 4
    || bytes[0] !== 0xff
    || bytes[1] !== 0xd8
  ) {
    return null;
  }

  let offset = 2;
  let dimensions: ScreenshotDimensions | null = null;
  let insideScan = false;
  let sawScan = false;
  let sawEntropyData = false;
  while (offset < bytes.length) {
    if (insideScan) {
      if (bytes[offset] !== 0xff) {
        sawEntropyData = true;
        offset += 1;
        continue;
      }
      const markerStart = offset;
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
      if (offset >= bytes.length) return null;
      const scanMarker = bytes[offset];
      offset += 1;
      if (scanMarker === 0x00) {
        sawEntropyData = true;
        continue;
      }
      if (scanMarker >= 0xd0 && scanMarker <= 0xd7) continue;
      insideScan = false;
      offset = markerStart;
      continue;
    }

    if (bytes[offset] !== 0xff) return null;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return null;

    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9) {
      return (
        dimensions !== null
        && sawScan
        && sawEntropyData
        && offset === bytes.length
      ) ? dimensions : null;
    }
    if (marker === 0x00 || marker === 0xd8) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    if (offset + 2 > bytes.length) return null;

    const segmentLength = readUint16BigEndian(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (jpegStartOfFrameMarkers.has(marker)) {
      const components = bytes[offset + 7];
      if (
        dimensions !== null
        || components === 0
        || segmentLength !== 8 + 3 * components
      ) {
        return null;
      }
      const height = readUint16BigEndian(bytes, offset + 3);
      const width = readUint16BigEndian(bytes, offset + 5);
      if (width === 0 || height === 0) return null;
      dimensions = { width, height };
    } else if (marker === 0xda) {
      const components = bytes[offset + 2];
      if (
        dimensions === null
        || components === 0
        || segmentLength !== 6 + 2 * components
      ) {
        return null;
      }
      sawScan = true;
      insideScan = true;
    }
    offset += segmentLength;
  }
  return null;
}

interface WebpScreenshotInspection {
  readonly animated: boolean;
  readonly dimensions: readonly ScreenshotDimensions[];
}

function inspectWebpScreenshot(bytes: Uint8Array): WebpScreenshotInspection | null {
  if (bytes.length < 20) return null;
  const declaredEnd = 8 + readUint32LittleEndian(bytes, 4);
  if (declaredEnd < 20 || declaredEnd !== bytes.length) return null;

  const dimensions: ScreenshotDimensions[] = [];
  let extendedDimensions: ScreenshotDimensions | null = null;
  let animated = false;
  let chunkCount = 0;
  let imageChunks = 0;
  let offset = 12;
  while (offset + 8 <= declaredEnd) {
    const format = readAscii(bytes, offset, 4);
    const chunkLength = readUint32LittleEndian(bytes, offset + 4);
    const dataOffset = offset + 8;
    const chunkEnd = dataOffset + chunkLength;
    const paddedEnd = chunkEnd + (chunkLength % 2);
    if (
      chunkEnd < dataOffset
      || paddedEnd > declaredEnd
      || (chunkLength % 2 !== 0 && bytes[chunkEnd] !== 0)
    ) {
      return null;
    }
    chunkCount += 1;

    if (format === "VP8X") {
      if (
        chunkCount !== 1
        || extendedDimensions !== null
        || chunkLength !== 10
        || (bytes[dataOffset] & 0xc1) !== 0
      ) {
        return null;
      }
      extendedDimensions = {
        width: 1 + readUint24LittleEndian(bytes, dataOffset + 4),
        height: 1 + readUint24LittleEndian(bytes, dataOffset + 7),
      };
      animated ||= (bytes[dataOffset] & 0x02) !== 0;
    } else if (format === "VP8 ") {
      const frameTag = bytes[dataOffset]
        + bytes[dataOffset + 1] * 0x100
        + bytes[dataOffset + 2] * 0x1_0000;
      if (
        chunkLength < 10
        || (frameTag & 1) !== 0
        || ((frameTag >> 1) & 0x07) > 3
        || (frameTag & 0x10) === 0
        || (frameTag >>> 5) === 0
        || 10 + (frameTag >>> 5) > chunkLength
        || bytes[dataOffset + 3] !== 0x9d
        || bytes[dataOffset + 4] !== 0x01
        || bytes[dataOffset + 5] !== 0x2a
      ) {
        return null;
      }
      imageChunks += 1;
      const imageDimensions = {
        width: readUint16LittleEndian(bytes, dataOffset + 6) & 0x3fff,
        height: readUint16LittleEndian(bytes, dataOffset + 8) & 0x3fff,
      };
      if (imageDimensions.width === 0 || imageDimensions.height === 0) return null;
      dimensions.push(imageDimensions);
    } else if (format === "VP8L") {
      if (
        chunkLength <= 5
        || bytes[dataOffset] !== 0x2f
        || (bytes[dataOffset + 4] & 0xe0) !== 0
      ) {
        return null;
      }
      imageChunks += 1;
      dimensions.push({
        width: 1 + bytes[dataOffset + 1] + ((bytes[dataOffset + 2] & 0x3f) << 8),
        height: 1
          + ((bytes[dataOffset + 2] & 0xc0) >> 6)
          + (bytes[dataOffset + 3] << 2)
          + ((bytes[dataOffset + 4] & 0x0f) << 10),
      });
    } else if (format === "ANIM") {
      if (chunkLength !== 6) return null;
      animated = true;
    } else if (format === "ANMF") {
      if (chunkLength < 16) return null;
      animated = true;
    }

    offset = paddedEnd;
  }
  if (offset !== declaredEnd) return null;
  if (animated) {
    return extendedDimensions === null
      ? null
      : { animated: true, dimensions: [extendedDimensions] };
  }
  if (imageChunks !== 1 || dimensions.length !== 1) return null;
  if (extendedDimensions === null) {
    if (chunkCount !== 1) return null;
  } else if (
    dimensions[0].width !== extendedDimensions.width
    || dimensions[0].height !== extendedDimensions.height
  ) {
    return null;
  }
  return {
    animated: false,
    dimensions: extendedDimensions === null ? dimensions : [extendedDimensions],
  };
}

async function inspectStillScreenshotDimensions(
  mediaType: Exclude<ScreenshotMediaType, "image/gif" | "image/webp">,
  bytes: Uint8Array,
): Promise<readonly ScreenshotDimensions[] | null> {
  const dimensions = mediaType === "image/png"
    ? await inspectPngDimensions(bytes)
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
  readonly dimensions: readonly ScreenshotDimensions[];
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
  const dimensions: ScreenshotDimensions[] = [{
    width: logicalWidth,
    height: logicalHeight,
  }];

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
      return index === bytes.length
        ? { dimensions, dimensionsWithinBudget, frameCount: frames }
        : null;
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
    dimensions.push({ width: frameWidth, height: frameHeight });
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

export async function validateScreenshotDataUrl(
  value: unknown,
): Promise<ValidatedScreenshotDataUrl> {
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

  let dimensions: readonly ScreenshotDimensions[];
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
    dimensions = inspection.dimensions;
  } else if (mediaType === "image/webp") {
    const inspection = inspectWebpScreenshot(bytes);
    if (inspection === null) {
      throw new IdentificationValidationError(
        "invalid_screenshot",
        "WebP screenshot data is incomplete or malformed.",
      );
    }
    if (inspection.animated) {
      throw new IdentificationValidationError(
        "invalid_screenshot",
        "Animated WebP screenshots are not supported.",
      );
    }
    if (inspection.dimensions.some(
      (item) => !screenshotDimensionsWithinBudget(item.width, item.height),
    )) {
      throw new IdentificationValidationError(
        "screenshot_too_large",
        `Screenshot dimensions must not exceed ${MAX_SCREENSHOT_SIDE} px per side or ${MAX_SCREENSHOT_PIXELS} total pixels.`,
      );
    }
    dimensions = inspection.dimensions;
  } else {
    const inspectedDimensions = await inspectStillScreenshotDimensions(mediaType, bytes);
    if (inspectedDimensions === null) {
      throw new IdentificationValidationError(
        "invalid_screenshot",
        "Screenshot dimensions are incomplete or malformed.",
      );
    }
    if (inspectedDimensions.some(
      (item) => !screenshotDimensionsWithinBudget(item.width, item.height),
    )) {
      throw new IdentificationValidationError(
        "screenshot_too_large",
        `Screenshot dimensions must not exceed ${MAX_SCREENSHOT_SIDE} px per side or ${MAX_SCREENSHOT_PIXELS} total pixels.`,
      );
    }
    dimensions = inspectedDimensions;
  }

  return {
    dataUrl: value,
    mediaType,
    byteLength,
    width: Math.max(...dimensions.map((item) => item.width)),
    height: Math.max(...dimensions.map((item) => item.height)),
  };
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
