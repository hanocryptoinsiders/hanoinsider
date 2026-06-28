export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  body: string | null;
  thumbnail_url: string | null;
  content_type: "insight" | "article" | "video";
  category: string | null;
  tags: string[];
  is_premium: boolean;
  /** When true the item is shareable publicly at /share/[slug] without login. */
  is_public?: boolean;
  status: "draft" | "published" | "archived";
  video_url: string | null;
  /** Optional slug linking to /dashboard/coins/[slug] (e.g. bitcoin, ethereum). */
  related_coin_slug?: string | null;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
