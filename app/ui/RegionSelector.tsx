"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export interface RegionSelection {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface RegionSelectorProps {
  readonly disabled?: boolean;
  readonly imageUrl: string;
  readonly onChange: (selection: RegionSelection | null) => void;
  readonly selection: RegionSelection | null;
}

type Point = { x: number; y: number };

export const MAX_SCREENSHOT_SIDE = 8_192;
export const MAX_SCREENSHOT_PIXELS = 16_000_000;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function pointFromEvent(event: ReactPointerEvent<HTMLDivElement>): Point {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: clamp(((event.clientX - bounds.left) / bounds.width) * 100, 0, 100),
    y: clamp(((event.clientY - bounds.top) / bounds.height) * 100, 0, 100),
  };
}

function selectionFromPoints(start: Point, end: Point): RegionSelection | null {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  if (width < 1 || height < 1) return null;
  return { x, y, width, height };
}

function normalizedSelection(selection: RegionSelection): RegionSelection | null {
  const x = clamp(selection.x, 0, 99);
  const y = clamp(selection.y, 0, 99);
  const width = clamp(selection.width, 1, 100 - x);
  const height = clamp(selection.height, 1, 100 - y);
  if (x === 0 && y === 0 && width === 100 && height === 100) return null;
  return { x, y, width, height };
}

function dimensionsWithinBudget(width: number, height: number): boolean {
  return (
    width >= 1
    && height >= 1
    && width <= MAX_SCREENSHOT_SIDE
    && height <= MAX_SCREENSHOT_SIDE
    && width * height <= MAX_SCREENSHOT_PIXELS
  );
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

function gifFrameDimensionsWithinBudget(bytes: Uint8Array): boolean | null {
  if (bytes.length < 14) return null;
  const signature = String.fromCharCode(...bytes.slice(0, 6));
  if (signature !== "GIF87a" && signature !== "GIF89a") return null;
  const readUint16 = (offset: number) => bytes[offset] | (bytes[offset + 1] << 8);
  let index = 13;
  if ((bytes[10] & 0x80) !== 0) {
    index += 3 * (2 ** ((bytes[10] & 0x07) + 1));
  }

  let frameCount = 0;
  let withinBudget = true;
  while (index < bytes.length) {
    const marker = bytes[index];
    index += 1;
    if (marker === 0x3b) return frameCount > 0 ? withinBudget : null;
    if (marker === 0x21) {
      if (index >= bytes.length) return null;
      index += 1;
      const next = skipGifSubBlocks(bytes, index);
      if (next === null) return null;
      index = next;
      continue;
    }
    if (marker !== 0x2c || index + 9 > bytes.length) return null;

    const frameWidth = readUint16(index + 4);
    const frameHeight = readUint16(index + 6);
    if (frameWidth === 0 || frameHeight === 0) return null;
    withinBudget &&= dimensionsWithinBudget(frameWidth, frameHeight);
    frameCount += 1;

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

function imageDimensions(bytes: Uint8Array, mediaType: string): Point | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (mediaType === "image/png" && bytes.length >= 24) {
    const isPng = [137, 80, 78, 71, 13, 10, 26, 10]
      .every((value, index) => bytes[index] === value);
    if (
      isPng
      && view.getUint32(8) === 13
      && String.fromCharCode(...bytes.slice(12, 16)) === "IHDR"
    ) {
      return { x: view.getUint32(16), y: view.getUint32(20) };
    }
  }

  if (mediaType === "image/gif" && bytes.length >= 10) {
    const signature = String.fromCharCode(...bytes.slice(0, 6));
    if (signature === "GIF87a" || signature === "GIF89a") {
      return { x: view.getUint16(6, true), y: view.getUint16(8, true) };
    }
  }

  if (mediaType === "image/jpeg" && bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const startOfFrameMarkers = new Set([
      0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
      0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
    ]);
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      while (bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset];
      offset += 1;
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 1 >= bytes.length) break;
      const segmentLength = view.getUint16(offset);
      if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
      if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
        return { x: view.getUint16(offset + 5), y: view.getUint16(offset + 3) };
      }
      offset += segmentLength;
    }
  }

  if (
    mediaType === "image/webp"
    && bytes.length >= 21
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    const format = String.fromCharCode(...bytes.slice(12, 16));
    if (format === "VP8X" && bytes.length >= 30) {
      const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
      return { x: width, y: height };
    }
    if (
      format === "VP8 "
      && bytes.length >= 30
      && bytes[23] === 0x9d
      && bytes[24] === 0x01
      && bytes[25] === 0x2a
    ) {
      return {
        x: view.getUint16(26, true) & 0x3fff,
        y: view.getUint16(28, true) & 0x3fff,
      };
    }
    if (format === "VP8L" && bytes[20] === 0x2f && bytes.length >= 25) {
      return {
        x: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
        y: 1 + ((bytes[22] & 0xc0) >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10),
      };
    }
  }

  return null;
}

export async function validateScreenshotDimensions(file: File): Promise<void> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const dimensions = imageDimensions(bytes, file.type);
  if (!dimensions || dimensions.x < 1 || dimensions.y < 1) {
    throw new Error("无法读取截图尺寸，请换一张完整的图片。");
  }
  if (!dimensionsWithinBudget(dimensions.x, dimensions.y)) {
    throw new Error("截图尺寸过大；单边不能超过 8,192 像素，且总像素不能超过 1,600 万。");
  }
  if (file.type === "image/gif") {
    const frameDimensionsWithinBudget = gifFrameDimensionsWithinBudget(bytes);
    if (frameDimensionsWithinBudget === null) {
      throw new Error("无法读取截图尺寸，请换一张完整的图片。");
    }
    if (!frameDimensionsWithinBudget) {
      throw new Error("截图尺寸过大；单边不能超过 8,192 像素，且总像素不能超过 1,600 万。");
    }
  }
}

function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("浏览器无法编码这张截图。"));
    };
    reader.onerror = () => reject(new Error("浏览器无法编码这张截图。"));
    reader.readAsDataURL(blob);
  });
}

export function RegionSelector({
  disabled = false,
  imageUrl,
  onChange,
  selection,
}: RegionSelectorProps) {
  const dragStartRef = useRef<Point | null>(null);
  const [announcement, setAnnouncement] = useState("当前分析整张图片");
  const current = selection ?? { x: 0, y: 0, width: 100, height: 100 };

  const announce = (next: RegionSelection | null) => {
    if (!next) {
      setAnnouncement("当前分析整张图片");
      return;
    }
    setAnnouncement(
      `选区左侧 ${Math.round(next.x)}%，顶部 ${Math.round(next.y)}%，宽 ${Math.round(next.width)}%，高 ${Math.round(next.height)}%`,
    );
  };

  const update = (next: RegionSelection | null) => {
    const normalized = next ? normalizedSelection(next) : null;
    onChange(normalized);
    announce(normalized);
  };

  const beginSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    const start = pointFromEvent(event);
    dragStartRef.current = start;
    event.currentTarget.setPointerCapture(event.pointerId);
    onChange({ x: start.x, y: start.y, width: 1, height: 1 });
  };

  const moveSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start || disabled) return;
    const next = selectionFromPoints(start, pointFromEvent(event));
    if (next) onChange(next);
  };

  const finishSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    dragStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    update(selectionFromPoints(start, pointFromEvent(event)));
  };

  const updateField = (field: keyof RegionSelection, rawValue: string) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    update({ ...current, [field]: value });
  };

  return (
    <div className="analyzer-region-selector">
      <div className="analyzer-image-scroll">
        <div className="analyzer-image-stage">
          {/* Object URLs need their natural dimensions for precise browser-side cropping. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="待识别的界面截图" draggable={false} src={imageUrl} />
          <div
            aria-label="拖动以框选要识别的界面区域"
            className="analyzer-region-draw-layer"
            onPointerCancel={finishSelection}
            onPointerDown={beginSelection}
            onPointerMove={moveSelection}
            onPointerUp={finishSelection}
          >
            {selection && (
              <span
                aria-hidden="true"
                className="analyzer-region-selection"
                style={{
                  height: `${selection.height}%`,
                  left: `${selection.x}%`,
                  top: `${selection.y}%`,
                  width: `${selection.width}%`,
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="analyzer-region-controls">
        <div>
          <strong>{selection ? "只分析框选区域" : "分析整张图片"}</strong>
          <span>可直接在图片上拖动，或用下方数值精确调整。</span>
        </div>
        <button disabled={disabled || !selection} onClick={() => update(null)} type="button">
          使用整张图片
        </button>
      </div>

      <fieldset className="analyzer-region-fields" disabled={disabled}>
        <legend>选区位置与尺寸（百分比）</legend>
        {(
          [
            ["x", "左侧"],
            ["y", "顶部"],
            ["width", "宽度"],
            ["height", "高度"],
          ] as const
        ).map(([field, label]) => (
          <label key={field}>
            <span>{label}</span>
            <input
              inputMode="decimal"
              max="100"
              min={field === "width" || field === "height" ? "1" : "0"}
              onChange={(event) => updateField(field, event.target.value)}
              step="1"
              type="number"
              value={Math.round(current[field])}
            />
          </label>
        ))}
      </fieldset>
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
    </div>
  );
}

export async function cropScreenshot(
  imageUrl: string,
  selection: RegionSelection | null,
  outputMediaType: "image/webp" | "image/jpeg" = "image/webp",
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const next = new Image();
    next.onload = () => resolve(next);
    next.onerror = () => reject(new Error("无法读取截图，请换一张图片重试。"));
    next.src = imageUrl;
  });

  const region = selection ?? { x: 0, y: 0, width: 100, height: 100 };
  const sourceX = Math.round((region.x / 100) * image.naturalWidth);
  const sourceY = Math.round((region.y / 100) * image.naturalHeight);
  const sourceWidth = Math.max(1, Math.round((region.width / 100) * image.naturalWidth));
  const sourceHeight = Math.max(1, Math.round((region.height / 100) * image.naturalHeight));
  const maxSide = 2048;
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法处理这张截图。请换用 PNG 或 JPEG。");
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => value
          ? resolve(value)
          : reject(new Error("浏览器无法编码这张截图。")),
        outputMediaType,
        outputMediaType === "image/jpeg" ? 0.92 : 0.9,
      );
    });
    return await blobDataUrl(blob);
  } finally {
    canvas.width = 1;
    canvas.height = 1;
  }
}
