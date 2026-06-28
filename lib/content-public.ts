import { getServiceSupabase } from "@/lib/supabase/service";

/** Shape returned for publicly shared content (no auth required). */
export interface PublicSharedContent {
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
  is_public: boolean;
  status: "published";
  video_url: string | null;
  related_coin_slug: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const PUBLIC_COLUMNS =
  "id, title, slug, description, body, thumbnail_url, content_type, category, tags, is_premium, is_public, status, video_url, published_at, created_at, updated_at, related_coin_slug";

/**
 * Fetches publicly shared content for anonymous visitors.
 * Uses the service role on the server only — callers must enforce is_public + published.
 */
export async function getPublicSharedContentBySlug(
  slug: string,
): Promise<PublicSharedContent | null> {
  try {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from("content_items")
      .select(PUBLIC_COLUMNS)
      .eq("slug", slug)
      .eq("is_public", true)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      console.error("[getPublicSharedContentBySlug]", error.message);
      return null;
    }

    if (!data) return null;

    return {
      ...data,
      tags: data.tags ?? [],
    } as PublicSharedContent;
  } catch (err) {
    console.error("[getPublicSharedContentBySlug]", err);
    return null;
  }
}
