"use client";

import { useEffect, useRef, useState } from "react";
import { DemoStage } from "./DemoStage";

export function InteractiveDetail({ slug }: { slug: string }) {
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("");
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    shellRef.current?.setAttribute("data-hydrated", "true");
  }, []);

  return (
    <div className="detail-demo-shell" ref={shellRef}>
      <div className="detail-demo-toolbar">
        <span>INTERACTIVE DEMO · LOCAL STATE ONLY</span>
        <button
          type="button"
          onClick={() => {
            setRevision((value) => value + 1);
            setStatus("演示已重置");
          }}
        >
          重置演示 ↻
        </button>
      </div>
      <div className="detail-demo-canvas">
        <DemoStage key={revision} slug={slug} density="detail" />
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

export function CopyPrompt({ prompt }: { prompt: string }) {
  const [copyResult, setCopyResult] = useState<{
    message: string;
    state: "" | "success" | "error";
  }>({ message: "", state: "" });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyResult({ message: "提示词已复制", state: "success" });
    } catch {
      setCopyResult({ message: "复制失败，请手动选择文字", state: "error" });
    }
  };

  return (
    <>
      <div className="prompt-box">
        <code>{prompt}</code>
        <button
          aria-label="复制 AI 提示词"
          className="copy-icon-button"
          data-copied={copyResult.state === "success" || undefined}
          title="复制 AI 提示词"
          type="button"
          onClick={copy}
        >
          <span aria-hidden="true" className="copy-icon-button__glyph" />
        </button>
      </div>
      <p
        aria-atomic="true"
        className="copy-inline-status"
        data-state={copyResult.state || undefined}
        role={copyResult.state === "error" ? "alert" : "status"}
      >
        {copyResult.message || " "}
      </p>
    </>
  );
}
