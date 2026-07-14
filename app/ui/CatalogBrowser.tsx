"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DemoStage } from "./DemoStage";

type Bilingual = { zh: string; en: string };

type FilterOption = {
  id: string;
  zh: string;
  en: string;
};

type CardItem = {
  slug: string;
  order: number;
  category: string;
  platforms: readonly string[];
  name: Bilingual;
  summary: Bilingual;
  searchText: string;
};

type CatalogBrowserProps = {
  items: CardItem[];
  categories: readonly FilterOption[];
  platforms: readonly FilterOption[];
  initialQuery: string;
  initialCategory: string;
  initialPlatform: string;
};

const PAGE_SIZE = 24;

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

export function CatalogBrowser({
  items,
  categories,
  platforms,
  initialQuery,
  initialCategory,
  initialPlatform,
}: CatalogBrowserProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [platform, setPlatform] = useState(initialPlatform);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category !== "all") params.set("category", category);
      if (platform !== "all") params.set("platform", platform);
      const next = params.size ? `?${params.toString()}` : window.location.pathname;
      window.history.replaceState(null, "", next);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [query, category, platform]);

  const filtered = useMemo(() => {
    const tokens = normalize(query).split(" ").filter(Boolean);
    return items.filter((item) => {
      const matchesQuery = tokens.every((token) =>
        normalize(item.searchText).includes(token),
      );
      const matchesCategory = category === "all" || item.category === category;
      const matchesPlatform =
        platform === "all" ||
        item.platforms.includes(platform) ||
        item.platforms.includes("universal");
      return matchesQuery && matchesCategory && matchesPlatform;
    });
  }, [items, query, category, platform]);

  const visible = filtered.slice(0, visibleCount);
  const categoryMap = new Map(categories.map((item) => [item.id, item]));
  const platformMap = new Map(platforms.map((item) => [item.id, item]));

  const clearFilters = () => {
    setQuery("");
    setCategory("all");
    setPlatform("all");
    setVisibleCount(PAGE_SIZE);
    searchRef.current?.focus();
  };

  const updateQuery = (next: string) => {
    setQuery(next);
    setVisibleCount(PAGE_SIZE);
  };

  const updateCategory = (next: string) => {
    setCategory(next);
    setVisibleCount(PAGE_SIZE);
  };

  const updatePlatform = (next: string) => {
    setPlatform(next);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <main>
      <a className="skip-link" href="#catalog">
        跳到组件目录
      </a>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="这叫啥 UI？返回顶部">
          <span className="brand-mark" aria-hidden="true">
            UI
          </span>
          <span>
            这叫啥 <strong>UI？</strong>
          </span>
        </a>
        <nav aria-label="站点导航">
          <a href="#catalog">组件目录</a>
          <a href="#terms">术语说明</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">INTERACTIVE UI / UX DICTIONARY</p>
          <h1>
            不知道它叫什么？
            <span>先亲手试试看。</span>
          </h1>
          <p className="hero-intro">
            75 个常用组件与交互模式，中英名称、使用场景和可复制代码一次看懂。
          </p>
        </div>
        <dl className="hero-stats" aria-label="站点内容统计">
          <div>
            <dt>组件条目</dt>
            <dd>75</dd>
          </div>
          <div>
            <dt>内容分类</dt>
            <dd>09</dd>
          </div>
          <div>
            <dt>代码方案</dt>
            <dd>150</dd>
          </div>
        </dl>

        <div className="search-panel">
          <label htmlFor="component-search">描述你看到的东西</label>
          <div className="search-control">
            <span aria-hidden="true">⌕</span>
            <input
              ref={searchRef}
              id="component-search"
              type="search"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder="例如：可以拖动的圆点、右键出现的菜单……"
              autoComplete="off"
            />
            <kbd>⌘ / Ctrl K</kbd>
          </div>
          <div className="search-examples" aria-label="搜索示例">
            <span>试试：</span>
            {["从侧边滑出来", "短暂出现的提示", "图片左右对比"].map(
              (example) => (
                <button key={example} type="button" onClick={() => updateQuery(example)}>
                  {example}
                </button>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="term-strip" id="terms" aria-labelledby="terms-title">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">THREE USEFUL TERMS</p>
            <h2 id="terms-title">先分清这三个说法</h2>
          </div>
        </div>
        <div className="term-grid">
          <article>
            <span>01</span>
            <h3>组件预览</h3>
            <p lang="en">Component Preview</p>
            <small>像图片一样概览组件外观的整张卡片。</small>
          </article>
          <article>
            <span>02</span>
            <h3>交互式演示</h3>
            <p lang="en">Interactive Demo</p>
            <small>可以点击、拖动或输入，亲自感受组件行为。</small>
          </article>
          <article>
            <span>03</span>
            <h3>实时预览</h3>
            <p lang="en">Live Preview</p>
            <small>调整参数或内容后，画面会立即同步更新。</small>
          </article>
        </div>
      </section>

      <section className="catalog-section" id="catalog" aria-labelledby="catalog-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EXPLORE THE CATALOG</p>
            <h2 id="catalog-title">组件目录</h2>
          </div>
          <p className="result-count" aria-live="polite">
            找到 <strong>{filtered.length}</strong> 个结果
          </p>
        </div>

        <div className="filter-bar" aria-label="筛选组件">
          <div className="category-chips" role="group" aria-label="按分类筛选">
            <button
              type="button"
              className={category === "all" ? "active" : undefined}
              aria-pressed={category === "all"}
              onClick={() => updateCategory("all")}
            >
              全部 <span>{items.length}</span>
            </button>
            {categories.map((item) => (
              <button
                type="button"
                key={item.id}
                className={category === item.id ? "active" : undefined}
                aria-pressed={category === item.id}
                onClick={() => updateCategory(item.id)}
              >
                {item.zh}
              </button>
            ))}
          </div>
          <label className="platform-filter">
            <span>平台</span>
            <select value={platform} onChange={(event) => updatePlatform(event.target.value)}>
              <option value="all">全部平台</option>
              {platforms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.en}
                </option>
              ))}
            </select>
          </label>
        </div>

        {visible.length ? (
          <div className="catalog-grid">
            {visible.map((item) => {
              const categoryLabel = categoryMap.get(item.category);
              return (
                <article className="component-card" key={item.slug}>
                  <div className="preview-shell">
                    <div className="preview-meta">
                      <span>INTERACTIVE DEMO</span>
                      <span className="preview-live-dot">LIVE</span>
                    </div>
                    <DemoStage slug={item.slug} density="card" />
                  </div>
                  <div className="card-body">
                    <div className="card-kicker">
                      <span>{String(item.order).padStart(2, "0")}</span>
                      <span>{categoryLabel?.zh}</span>
                    </div>
                    <h3>
                      <Link href={`/components/${item.slug}`}>{item.name.zh}</Link>
                    </h3>
                    <p className="english-name" lang="en">
                      {item.name.en}
                    </p>
                    <p className="card-summary">{item.summary.zh}</p>
                    <div className="card-footer">
                      <div className="platform-tags" aria-label="适用平台">
                        {item.platforms.slice(0, 2).map((id) => (
                          <span key={id}>{platformMap.get(id)?.en ?? id}</span>
                        ))}
                      </div>
                      <Link className="detail-link" href={`/components/${item.slug}`}>
                        查看详情 <span aria-hidden="true">↗</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-results">
            <span aria-hidden="true">?</span>
            <h3>暂时没找到这个说法</h3>
            <p>换个描述试试，或清除筛选浏览全部组件。</p>
            <button type="button" onClick={clearFilters}>清除筛选</button>
          </div>
        )}

        {visibleCount < filtered.length && (
          <div className="load-more-wrap">
            <button
              className="load-more"
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              再看 24 个组件
              <span aria-hidden="true">↓</span>
            </button>
          </div>
        )}
      </section>

      <footer className="site-footer">
        <p>
          <strong>这叫啥 UI？</strong> — 把“看起来像”变成“准确地说”。
        </p>
        <a href="#top">回到顶部 ↑</a>
      </footer>
    </main>
  );
}
