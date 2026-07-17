import type { Metadata } from "next";
import { CatalogBrowser } from "./ui/CatalogBrowser";
import {
  catalog,
  categories,
  createCatalogSearchText,
  platforms,
} from "@/lib/catalog";

export const metadata: Metadata = {
  title: "AI UI/UX 视觉词典",
  description:
    "上传截图或输入公开网页，识别 UI/UX 组件，查看证据、易混区别、实现指导、交互演示与可复制代码。",
};

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const value = (key: string) => {
    const entry = params[key];
    return Array.isArray(entry) ? entry[0] ?? "" : entry ?? "";
  };
  const requestedCategory = value("category");
  const requestedPlatform = value("platform");
  const initialCategory = categories.some((item) => item.id === requestedCategory)
    ? requestedCategory
    : "all";
  const initialPlatform = platforms.some((item) => item.id === requestedPlatform)
    ? requestedPlatform
    : "all";
  const cards = catalog.map((item) => ({
    slug: item.slug,
    category: item.category,
    platforms: item.platforms,
    name: item.name,
    summary: item.summary,
    searchText: createCatalogSearchText(item),
  }));

  return (
    <CatalogBrowser
      items={cards}
      categories={categories}
      platforms={platforms}
      initialQuery={value("q")}
      initialCategory={initialCategory}
      initialPlatform={initialPlatform}
    />
  );
}
