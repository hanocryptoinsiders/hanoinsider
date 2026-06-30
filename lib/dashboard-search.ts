import { coinProfiles } from "@/lib/coin-profiles";

export type DeskSearchResultType = "article" | "insight" | "video" | "coin" | "page";

export type DeskSearchResult = {
  id: string;
  title: string;
  subtitle?: string | null;
  href: string;
  type: DeskSearchResultType;
};

type PublishedSearchRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content_type: "insight" | "article" | "video";
  category: string | null;
  tags?: string[] | null;
};

const DESK_PAGES: DeskSearchResult[] = [
  { id: "page-dashboard", title: "Dashboard", subtitle: "Your intelligence desk", href: "/dashboard", type: "page" },
  { id: "page-market", title: "Market Overview", subtitle: "Live market context", href: "/dashboard/market", type: "page" },
  { id: "page-insights", title: "Insights", subtitle: "Educational briefs", href: "/dashboard/insights", type: "page" },
  { id: "page-articles", title: "Articles", subtitle: "Market analysis", href: "/dashboard/articles", type: "page" },
  { id: "page-videos", title: "Videos", subtitle: "Desk video library", href: "/dashboard/videos", type: "page" },
  { id: "page-affiliate", title: "Affiliate", subtitle: "Referrals and commissions", href: "/dashboard/affiliate", type: "page" },
  { id: "page-support", title: "Support", subtitle: "Member help", href: "/dashboard/support", type: "page" },
  { id: "page-settings", title: "Settings", subtitle: "Account preferences", href: "/dashboard/settings", type: "page" },
];

export function sanitizeSearchQuery(raw: string): string {
  return raw.trim().replace(/[%_\\,]/g, "").slice(0, 80);
}

export function contentHref(contentType: PublishedSearchRow["content_type"], slug: string): string {
  const segment =
    contentType === "insight" ? "insights" : contentType === "video" ? "videos" : "articles";
  return `/dashboard/${segment}/${slug}`;
}

export function publishedRowToResult(row: PublishedSearchRow): DeskSearchResult | null {
  if (row.content_type !== "article" && row.content_type !== "insight" && row.content_type !== "video") {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    subtitle: row.category || row.description,
    href: contentHref(row.content_type, row.slug),
    type: row.content_type,
  };
}

export function searchDeskPages(query: string): DeskSearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  return DESK_PAGES.filter(
    (page) =>
      page.title.toLowerCase().includes(q) ||
      (page.subtitle?.toLowerCase().includes(q) ?? false),
  ).slice(0, 4);
}

export function searchCoins(query: string): DeskSearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  return coinProfiles
    .filter(
      (coin) =>
        coin.name.toLowerCase().includes(q) ||
        coin.symbol.toLowerCase().includes(q) ||
        coin.id.includes(q) ||
        coin.tags.some((tag) => tag.includes(q)),
    )
    .map((coin) => ({
      id: `coin-${coin.id}`,
      title: coin.name,
      subtitle: coin.symbol.toUpperCase(),
      href: `/dashboard/coins/${coin.id}`,
      type: "coin" as const,
    }))
    .slice(0, 5);
}

export function mergeSearchResults(...groups: DeskSearchResult[][]): DeskSearchResult[] {
  const seen = new Set<string>();
  const merged: DeskSearchResult[] = [];

  for (const group of groups) {
    for (const result of group) {
      if (seen.has(result.href)) continue;
      seen.add(result.href);
      merged.push(result);
    }
  }

  return merged.slice(0, 12);
}

export function matchesPublishedRow(row: PublishedSearchRow, query: string): boolean {
  const q = query.toLowerCase();
  const tagMatch = Array.isArray(row.tags)
    ? row.tags.some((tag) => String(tag).toLowerCase().includes(q))
    : false;

  return (
    row.title.toLowerCase().includes(q) ||
    (row.description?.toLowerCase().includes(q) ?? false) ||
    (row.category?.toLowerCase().includes(q) ?? false) ||
    tagMatch
  );
}
