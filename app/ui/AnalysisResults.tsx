"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AnalysisCandidate,
  IdentificationResponse,
} from "@/lib/identification-view";
import { CodeExplorer } from "./CodeExplorer";
import { DemoStage } from "./DemoStage";

const confidenceLabels = {
  high: "高可信",
  medium: "中可信",
  low: "低可信",
} as const;

const basisLabels = {
  screenshot: "截图像素分析",
  browser_snapshot: "网页视觉快照 + 无障碍语义",
  public_web: "公开网页内容分析",
} as const;

function implementationBrief(
  result: IdentificationResponse,
  candidate: AnalysisCandidate,
): string {
  const sections = [
    `${candidate.name.zh}（${candidate.name.en}）`,
    candidate.summary.zh,
    `识别依据：${candidate.evidence.join("；")}`,
    candidate.distinction ? `易混区别：${candidate.distinction}` : "",
    result.followUpQuestion ? `仍需确认：${result.followUpQuestion}` : "",
    result.implementation.anatomy.length
      ? `建议结构：${result.implementation.anatomy.join("；")}`
      : `建议结构：${candidate.anatomy.join("；")}`,
    result.implementation.behavior.length
      ? `交互行为：${result.implementation.behavior.join("；")}`
      : "",
    result.implementation.styling.length
      ? `视觉实现：${result.implementation.styling.join("；")}`
      : "",
    result.implementation.accessibility.length
      ? `无障碍：${result.implementation.accessibility.join("；")}`
      : `无障碍：${candidate.accessibility.join("；")}`,
    `给编程助手：${candidate.aiPrompt}`,
  ];
  return sections.filter(Boolean).join("\n");
}

export function AnalysisResults({ result }: { readonly result: IdentificationResponse }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [selectedSlug, setSelectedSlug] = useState(result.candidates[0]?.slug ?? "");
  const [copyStatus, setCopyStatus] = useState("");
  const [feedback, setFeedback] = useState<"" | "correct" | "wrong">("");

  useEffect(() => {
    headingRef.current?.focus();
  }, [result]);

  const selected = useMemo(
    () => result.candidates.find((candidate) => candidate.slug === selectedSlug),
    [result.candidates, selectedSlug],
  );

  const copyBrief = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(implementationBrief(result, selected));
      setCopyStatus("实现说明已复制");
    } catch {
      setCopyStatus("复制失败，请手动选择文字");
    }
  };

  return (
    <section className="analyzer-results" aria-labelledby="analysis-result-title">
      <header className="analyzer-results-heading">
        <div>
          <p className="eyebrow">IDENTIFICATION RESULT</p>
          <h2 id="analysis-result-title" ref={headingRef} tabIndex={-1}>
            {result.status === "unknown" ? "这次无法可靠命名" : "识别结果"}
          </h2>
        </div>
        <span className="analyzer-basis">{basisLabels[result.basis]}</span>
      </header>

      <div className="analyzer-result-summary">
        <p>{result.summary}</p>
        {result.notices.map((notice) => (
          <p className="analyzer-notice" key={notice}>{notice}</p>
        ))}
      </div>

      {result.sourcePreview && (
        <details className="analyzer-source-preview">
          <summary>查看用于分析的网页快照</summary>
          {/* A request-scoped data URL cannot use the framework image optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="用于本次识别的网页视觉快照" src={result.sourcePreview} />
        </details>
      )}

      {result.candidates.length > 0 ? (
        <>
          <div className="analyzer-candidates" aria-label="识别候选">
            {result.candidates.map((candidate, index) => (
              <article
                className="analyzer-candidate"
                data-selected={candidate.slug === selectedSlug || undefined}
                key={candidate.slug}
              >
                <button
                  aria-pressed={candidate.slug === selectedSlug}
                  onClick={() => {
                    setSelectedSlug(candidate.slug);
                    setFeedback(index === 0 ? "correct" : "");
                  }}
                  type="button"
                >
                  <span className="analyzer-candidate-rank">{index + 1}</span>
                  <span>
                    <strong>{candidate.name.zh}</strong>
                    <small lang="en">{candidate.name.en}</small>
                  </span>
                  <em data-confidence={candidate.confidence}>
                    {confidenceLabels[candidate.confidence]}
                  </em>
                </button>
                <p>{candidate.evidence.join("；")}</p>
                {candidate.distinction && <span>{candidate.distinction}</span>}
                <Link href={`/components/${candidate.slug}`}>查看完整解释 ↗</Link>
              </article>
            ))}
          </div>

          {(result.uncertainties.length > 0 || result.followUpQuestion) && (
            <div className="analyzer-uncertainty">
              <strong>还不能仅凭当前证据确定</strong>
              {result.uncertainties.length > 0 && (
                <ul>{result.uncertainties.map((line) => <li key={line}>{line}</li>)}</ul>
              )}
              {result.followUpQuestion && <p>{result.followUpQuestion}</p>}
            </div>
          )}

          {selected && (
            <div className="analyzer-selected-detail">
              <div className="analyzer-selected-head">
                <div>
                  <p className="eyebrow">SELECTED PATTERN</p>
                  <h3>{selected.name.zh} <span lang="en">/ {selected.name.en}</span></h3>
                  <p>{selected.summary.zh}</p>
                </div>
                <div className="analyzer-result-actions">
                  <button onClick={copyBrief} type="button">复制实现说明</button>
                  <Link href={`/components/${selected.slug}#code`}>打开完整代码 ↗</Link>
                </div>
              </div>
              <p aria-live="polite" className="analyzer-copy-status" role="status">
                {copyStatus || " "}
              </p>

              <div className="analyzer-detail-grid">
                <div className="analyzer-result-demo">
                  <div className="analyzer-subheading">
                    <strong>亲手确认</strong>
                    <span>演示状态只保留在当前页面</span>
                  </div>
                  <DemoStage density="detail" slug={selected.slug} />
                </div>
                <div className="analyzer-guidance-grid">
                  <section>
                    <h4>建议结构</h4>
                    <ul>
                      {(result.implementation.anatomy.length
                        ? result.implementation.anatomy
                        : selected.anatomy
                      ).map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </section>
                  <section>
                    <h4>交互与状态</h4>
                    <ul>
                      {(result.implementation.behavior.length
                        ? result.implementation.behavior
                        : selected.useWhen
                      ).map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </section>
                  <section>
                    <h4>视觉实现</h4>
                    <ul>
                      {(result.implementation.styling.length
                        ? result.implementation.styling
                        : [selected.summary.zh]
                      ).map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </section>
                  <section>
                    <h4>键盘与无障碍</h4>
                    <ul>
                      {(result.implementation.accessibility.length
                        ? result.implementation.accessibility
                        : selected.accessibility
                      ).map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </section>
                </div>
              </div>

              {selected.confusionGuide && (
                <p className="analyzer-confusion-guide">{selected.confusionGuide}</p>
              )}

              <div className="analyzer-code-result">
                <div className="analyzer-subheading">
                  <strong>可复制代码</strong>
                  <span>原生与 React 两套现有验证示例</span>
                </div>
                <CodeExplorer code={selected.code} />
              </div>
            </div>
          )}

          <div className="analyzer-feedback" aria-label="结果反馈">
            <span>这次判断准确吗？</span>
            <button
              aria-pressed={feedback === "correct"}
              onClick={() => setFeedback("correct")}
              type="button"
            >
              判断准确
            </button>
            <button
              aria-pressed={feedback === "wrong"}
              onClick={() => setFeedback("wrong")}
              type="button"
            >
              都不是
            </button>
            {feedback === "wrong" && (
              <a
                href="https://github.com/ReasonW6/what-ui-guide/issues/new"
                rel="noreferrer"
                target="_blank"
              >
                提交缺失术语 ↗
              </a>
            )}
          </div>
        </>
      ) : (
        <div className="analyzer-no-match">
          <h3>没有足够证据映射到现有 81 个术语</h3>
          <p>请缩小到单个组件、补充它的操作方式，或换一张能看到展开状态的截图。</p>
          <a
            href="https://github.com/ReasonW6/what-ui-guide/issues/new"
            rel="noreferrer"
            target="_blank"
          >
            告诉我们缺少什么术语 ↗
          </a>
        </div>
      )}

      {result.sources.length > 0 && (
        <details className="analyzer-sources">
          <summary>本次网页分析访问的公开来源</summary>
          <ul>
            {result.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} rel="noreferrer" target="_blank">
                  {source.title || source.url}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
