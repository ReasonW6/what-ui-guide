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
  return canvas.toDataURL("image/webp", 0.9);
}
