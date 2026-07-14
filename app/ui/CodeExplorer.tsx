"use client";

import { useId, useRef, useState } from "react";
import type { CodeBundle } from "@/lib/catalog";
import "./code-explorer.css";

type BundleKey = keyof CodeBundle;

export function CodeExplorer({ code }: { code: CodeBundle }) {
  const id = useId().replace(/:/g, "");
  const [bundle, setBundle] = useState<BundleKey>("vanilla");
  const [fileIndex, setFileIndex] = useState(0);
  const [copyResult, setCopyResult] = useState<{
    message: string;
    state: "" | "success" | "error";
  }>({ message: "", state: "" });
  const bundleRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const fileRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const bundles: Array<{ id: BundleKey; label: string }> = [
    { id: "vanilla", label: "HTML / CSS / JS" },
    { id: "react", label: "React + CSS" },
  ];
  const files = code[bundle];
  const activeFile = files[fileIndex] ?? files[0];

  const moveFocus = (
    event: React.KeyboardEvent,
    current: number,
    count: number,
    select: (next: number) => void,
    refs: React.RefObject<Array<HTMLButtonElement | null>>,
  ) => {
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % count;
    else if (event.key === "ArrowLeft") next = (current - 1 + count) % count;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    else return;
    event.preventDefault();
    select(next);
    window.requestAnimationFrame(() => refs.current?.[next]?.focus());
  };

  const selectBundle = (next: BundleKey) => {
    setBundle(next);
    setFileIndex(0);
    setCopyResult({ message: "", state: "" });
  };

  const copyCurrentFile = async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.code);
      setCopyResult({ message: `已复制 ${activeFile.name}`, state: "success" });
    } catch {
      setCopyResult({ message: "复制失败，请手动选择代码", state: "error" });
    }
  };

  if (!activeFile) return null;

  return (
    <div className="code-explorer">
      <div className="code-explorer-head">
        <div className="bundle-tabs" role="tablist" aria-label="代码方案">
          {bundles.map((item, index) => (
            <button
              key={item.id}
              ref={(node) => {
                bundleRefs.current[index] = node;
              }}
              id={`${id}-bundle-${item.id}`}
              type="button"
              role="tab"
              aria-selected={bundle === item.id}
              aria-controls={`${id}-bundle-panel`}
              tabIndex={bundle === item.id ? 0 : -1}
              onClick={() => selectBundle(item.id)}
              onKeyDown={(event) =>
                moveFocus(
                  event,
                  index,
                  bundles.length,
                  (next) => selectBundle(bundles[next].id),
                  bundleRefs,
                )
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="code-readonly">READ ONLY · SAFE TO COPY</span>
      </div>

      <div
        id={`${id}-bundle-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-bundle-${bundle}`}
        className="code-bundle-panel"
      >
        <div className="file-toolbar">
          <div className="file-tabs" role="tablist" aria-label="代码文件">
            {files.map((file, index) => (
              <button
                key={file.name}
                ref={(node) => {
                  fileRefs.current[index] = node;
                }}
                id={`${id}-file-${index}`}
                type="button"
                role="tab"
                aria-selected={fileIndex === index}
                aria-controls={`${id}-code-panel`}
                tabIndex={fileIndex === index ? 0 : -1}
                onClick={() => {
                  setFileIndex(index);
                  setCopyResult({ message: "", state: "" });
                }}
                onKeyDown={(event) =>
                  moveFocus(
                    event,
                    index,
                    files.length,
                    (next) => {
                      setFileIndex(next);
                      setCopyResult({ message: "", state: "" });
                    },
                    fileRefs,
                  )
                }
              >
                {file.name}
              </button>
            ))}
          </div>
          <button
            aria-label={`复制 ${activeFile.name}`}
            className="copy-code copy-icon-button"
            data-copied={copyResult.state === "success" || undefined}
            title={`复制 ${activeFile.name}`}
            type="button"
            onClick={copyCurrentFile}
          >
            <span aria-hidden="true" className="copy-icon-button__glyph" />
          </button>
        </div>

        <div
          id={`${id}-code-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-file-${fileIndex}`}
          className="code-panel"
        >
          <div className="code-gutter" aria-hidden="true">
            {activeFile.code.split("\n").map((_, index) => (
              <span key={index}>{index + 1}</span>
            ))}
          </div>
          <pre tabIndex={0} aria-label={`${activeFile.name} 代码`}>
            <code>{activeFile.code}</code>
          </pre>
        </div>
        <p
          aria-atomic="true"
          className="copy-status"
          data-state={copyResult.state || undefined}
          role={copyResult.state === "error" ? "alert" : "status"}
        >
          {copyResult.message || " "}
        </p>
      </div>
    </div>
  );
}
