import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CodeExplorer } from "@/app/ui/CodeExplorer";
import { GitHubLink } from "@/app/ui/GitHubLink";
import { ThemeSelect } from "@/app/ui/ThemeSelect";
import { CopyPrompt, InteractiveDetail } from "@/app/ui/InteractiveDetail";
import { catalog, categories, getCatalogItem } from "@/lib/catalog";
import { getConfusionGuide } from "@/lib/confusion-guides";
import { additionalSources } from "@/lib/catalog-additions";

type ComponentPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return catalog.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: ComponentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getCatalogItem(slug);
  if (!item) return { title: "组件未找到" };
  const title = `${item.name.zh} / ${item.name.en}`;
  const description = item.summary.zh;
  const url = `/components/${item.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      description,
      images: ["/og.png"],
      title,
      url,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: ["/og.png"],
      title,
    },
  };
}

export default async function ComponentPage({ params }: ComponentPageProps) {
  const { slug } = await params;
  const item = getCatalogItem(slug);
  if (!item) notFound();

  const category = categories.find((entry) => entry.id === item.category);
  const related = item.related
    .map((relatedSlug) => getCatalogItem(relatedSlug))
    .filter((relatedItem) => relatedItem !== undefined)
    .slice(0, 3);
  const confusionGuide = getConfusionGuide(item.slug)?.text;
  const reference = additionalSources[item.slug];

  return (
    <>
      <a className="skip-link" href="#component-content">跳到组件内容</a>
      <header className="detail-header">
        <div className="header-left">
          <Link className="brand" href="/" aria-label="返回这叫啥 UI？首页">
            <span>这叫啥 <strong>UI？</strong></span>
          </Link>
          <GitHubLink />
        </div>
        <div className="header-actions"><ThemeSelect /><Link className="back-link" href="/#catalog">← 返回组件目录</Link></div>
      </header>

      <main className="detail-main" id="component-content">
        <nav className="breadcrumbs" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/?category=${item.category}#catalog`}>{category?.zh}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{item.name.zh}</span>
        </nav>

        <div className="detail-layout">
          <aside className="detail-visual" aria-label={`${item.name.zh}交互式演示`}>
            <div className="detail-visual-sticky">
              <div className="detail-visual-heading">
                <p>Interactive Demo · 交互式演示</p>
                <span>亲手试一试，所有状态只保留在当前页面。</span>
              </div>
              <InteractiveDetail
                anatomy={item.anatomy}
                name={item.name.zh}
                slug={item.slug}
              />
              <nav className="detail-jump-nav" aria-label="本页目录">
                <a href="#guide">结构与使用</a>
                <a href="#prompt">AI 提示词</a>
                <a href="#code">可复制代码</a>
                {related.length > 0 && <a href="#related">相关组件</a>}
              </nav>
            </div>
          </aside>

          <div className="detail-content">
            <header className="detail-hero">
              <div>
                <p className="eyebrow">
                  COMPONENT {String(item.order).padStart(2, "0")} · {category?.en}
                </p>
                <h1>{item.name.zh}</h1>
                <p className="detail-english" lang="en">{item.name.en}</p>
                <div className="alias-list" aria-label="常见别名">
                  <span className="alias-label">也叫</span>
                  {item.aliases.map((alias) => <span key={alias}>{alias}</span>)}
                </div>
              </div>
              <div>
                <p className="detail-summary">{item.summary.zh}</p>
                <p className="detail-summary-en" lang="en">{item.summary.en}</p>
              </div>
            </header>

            <section className="detail-section" id="guide" aria-labelledby="guide-heading">
              <div className="detail-section-title">
                <div>
                  <p className="eyebrow">ANATOMY & USAGE</p>
                  <h2 id="guide-heading">结构与使用建议</h2>
                </div>
              </div>
              <div className="info-grid">
                <div className="info-panel">
                  <h3>组成部分</h3>
                  <ul>{item.anatomy.map((line) => <li key={line}>{line}</li>)}</ul>
                </div>
                <div className="info-panel">
                  <h3>适合使用</h3>
                  <ul>{item.useWhen.map((line) => <li key={line}>{line}</li>)}</ul>
                </div>
                <div className="info-panel">
                  <h3>不建议使用</h3>
                  <ul>{item.avoidWhen.map((line) => <li key={line}>{line}</li>)}</ul>
                </div>
                <div className="info-panel">
                  <h3>键盘与无障碍</h3>
                  <ul>{item.accessibility.map((line) => <li key={line}>{line}</li>)}</ul>
                </div>
              </div>
              {reference && <p className="component-reference">参考 <a href={reference.url} target="_blank" rel="noreferrer">{reference.title} ↗</a><span>核对于 2026-09-05</span></p>}
            </section>

            <section className="detail-section" id="prompt" aria-labelledby="prompt-heading">
              <div className="detail-section-title">
                <div>
                  <p className="eyebrow">DESCRIBE IT TO AI</p>
                  <h2 id="prompt-heading">这样告诉编程助手</h2>
                </div>
              </div>
              <CopyPrompt prompt={item.aiPrompt} />
            </section>

            <section className="detail-section" id="code" aria-labelledby="code-heading">
              <div className="detail-section-title">
                <div>
                  <p className="eyebrow">MINIMAL RUNNABLE CODE</p>
                  <h2 id="code-heading">可复制代码</h2>
                </div>
                <p>原生与 React 两套实现，不依赖第三方组件库。</p>
              </div>
              <CodeExplorer code={item.code} />
            </section>

            {related.length > 0 && (
              <section className="detail-section" id="related" aria-labelledby="related-heading">
                <div className="detail-section-title">
                  <div>
                    <p className="eyebrow">DON&apos;T CONFUSE THESE</p>
                    <h2 id="related-heading">易混与相关组件</h2>
                  </div>
                </div>
                {confusionGuide && <p className="confusion-guide">{confusionGuide}</p>}
                <div className="related-grid">
                  {related.map((relatedItem) => (
                    <Link
                      className="related-card"
                      href={`/components/${relatedItem.slug}`}
                      key={relatedItem.slug}
                    >
                      <span lang="en">{relatedItem.name.en}</span>
                      <strong>{relatedItem.name.zh} ↗</strong>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <footer className="site-footer">
        <p><strong>这叫啥 UI？</strong> — 把“看起来像”变成“准确地说”。</p>
        <Link href="/#catalog">继续浏览组件 →</Link>
      </footer>
    </>
  );
}
