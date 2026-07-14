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
          <span>这叫啥 <strong>UI？</strong></span>
        </a>
        <nav aria-label="站点导航">
          <a href="#catalog">组件目录</a>
          <button type="button" onClick={() => searchRef.current?.focus()}>
            搜索 <kbd>⌘ K</kbd>
          </button>
        </nav>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">INTERACTIVE UI / UX DICTIONARY</p>
        <h1>这个 UI，叫什么<span>？</span></h1>
        <p className="hero-intro">
          看见组件却不知道名称？亲手试一试，再用中英文标准术语准确描述它。
        </p>

        <div className="search-panel" id="search">
          <label className="sr-only" htmlFor="component-search">描述你看到的东西</label>
          <div className="search-control">
            <span aria-hidden="true">⌕</span>
            <input
              ref={searchRef}
              id="component-search"
              type="search"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder="描述你看到的东西，例如：可以拖动的圆点……"
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
        <h2 id="terms-title">展示方式</h2>
        <div className="term-grid">
          <article>
            <span>Component Preview</span>
            <p>组件预览 · 像图片一样概览外观</p>
          </article>
          <article>
            <span>Interactive Demo</span>
            <p>交互式演示 · 可以点击、拖动或输入</p>
          </article>
          <article>
            <span>Live Preview</span>
            <p>实时预览 · 参数变化会立即反映结果</p>
          </article>
        </div>
      </section>

      <section className="catalog-section" id="catalog" aria-labelledby="catalog-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EXPLORE THE CATALOG</p>
            <h2 id="catalog-title">浏览组件</h2>
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
                    <DemoStage slug={item.slug} density="card" />
                  </div>
                  <div className="card-body">
                    <div className="card-kicker">
                      <span>{String(item.order).padStart(2, "0")} · {categoryLabel?.zh}</span>
                      <span>Interactive Demo</span>
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
