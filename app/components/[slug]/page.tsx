import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CodeExplorer } from "@/app/ui/CodeExplorer";
import { CopyPrompt, InteractiveDetail } from "@/app/ui/InteractiveDetail";
import { catalog, categories, getCatalogItem } from "@/lib/catalog";

type ComponentPageProps = {
  params: Promise<{ slug: string }>;
};

const confusionGuides: ReadonlyArray<{
  slugs: readonly string[];
  text: string;
}> = [
  {
    slugs: ["select", "dropdown-menu", "combobox", "command-palette"],
    text: "Select 从固定选项中选值；Dropdown Menu 执行少量命令；Combobox 输入筛选选值；Command Palette 搜索并执行全局命令。",
  },
  {
    slugs: ["dialog", "alert-dialog", "scrim"],
    text: "Dialog 是内容容器；Modal 描述是否阻断背景；Scrim 是变暗并拦截背景交互的遮罩层。",
  },
  {
    slugs: ["toast", "snackbar"],
    text: "Toast 通常只告知状态；Snackbar 常在底部出现，并可附带一个简短操作。",
  },
  {
    slugs: ["tooltip", "popover", "hover-card"],
    text: "Tooltip 是短提示；Popover 可交互；Hover Card 用悬停或聚焦预览关联内容。",
  },
  {
    slugs: ["sidebar-navigation", "navigation-drawer", "side-sheet", "split-view"],
    text: "Sidebar 常驻导航；Drawer 临时滑出导航；Side Sheet 临时承载任务；Split View 是可并列调整的两个区域。",
  },
  {
    slugs: ["slider", "range-slider", "progress-bar", "progress-ring", "spinner"],
    text: "Slider 选择单值；Range Slider 选择区间；Progress Bar / Ring 展示确定进度；Spinner 只表示处理中。",
  },
  {
    slugs: ["badge", "chip", "tags-input"],
    text: "Badge 显示状态或数量；Chip 表示可操作实体；Tags Input 用于创建和编辑多个标签。",
  },
  {
    slugs: ["carousel", "image-gallery", "lightbox"],
    text: "Carousel 依次轮播；Gallery 总览一组图片；Lightbox 放大当前媒体并遮罩页面。",
  },
  {
    slugs: ["data-table", "data-grid"],
    text: "Data Table 侧重阅读与排序；Data Grid 还支持单元格选择、编辑等表格式操作。",
  },
];

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
      images: ["/og-image.png"],
      title,
      url,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: ["/og-image.png"],
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
  const confusionGuide = confusionGuides.find((group) =>
    group.slugs.includes(item.slug),
  )?.text;

  return (
    <>
      <a className="skip-link" href="#component-content">跳到组件内容</a>
      <header className="detail-header">
        <Link className="brand" href="/" aria-label="返回这叫啥 UI？首页">
          <span>这叫啥 <strong>UI？</strong></span>
        </Link>
        <Link className="back-link" href="/#catalog">← 返回组件目录</Link>
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
              <InteractiveDetail slug={item.slug} />
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
