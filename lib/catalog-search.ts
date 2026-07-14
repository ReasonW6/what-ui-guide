export interface CatalogSearchEntry {
  readonly category: string;
  readonly platforms: readonly string[];
  readonly searchText: string;
}

export interface CatalogSearchFilters {
  readonly q?: string;
  readonly category?: string;
  readonly platform?: string;
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[\s\-_—–/\\|·、，。！？：；,.!?():（）\[\]{}]+/g, " ")
    .trim();
}

export function matchesCatalogQuery(searchText: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const haystack = normalizeSearchText(searchText);
  const terms = normalizedQuery.split(" ").filter(Boolean);
  return (
    haystack.includes(normalizedQuery) ||
    terms.every((term) => haystack.includes(term))
  );
}

export function filterCatalogSearchEntries<T extends CatalogSearchEntry>(
  items: readonly T[],
  filters: CatalogSearchFilters = {},
): T[] {
  return items.filter((item) => {
    const matchesCategory =
      !filters.category || filters.category === "all" || item.category === filters.category;
    const matchesPlatform =
      !filters.platform || filters.platform === "all" || item.platforms.includes(filters.platform);
    return matchesCategory && matchesPlatform && matchesCatalogQuery(item.searchText, filters.q ?? "");
  });
}
