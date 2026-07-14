"use client";

import { useState } from "react";
import { DemoStage } from "./DemoStage";

export function InteractiveDetail({ slug }: { slug: string }) {
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("");

  return (
    <div className="detail-demo-shell">
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
  const [status, setStatus] = useState("");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus("提示词已复制");
    } catch {
      setStatus("复制失败，请手动选择文字");
    }
  };

  return (
    <>
      <div className="prompt-box">
        <code>{prompt}</code>
        <button
          aria-label="复制 AI 提示词"
          className="copy-icon-button"
          data-copied={status === "提示词已复制" || undefined}
          title="复制 AI 提示词"
          type="button"
          onClick={copy}
        >
          <span aria-hidden="true" className="copy-icon-button__glyph" />
        </button>
      </div>
      <p className="copy-inline-status" role="status" aria-live="polite">
        {status || " "}
      </p>
    </>
  );
}
