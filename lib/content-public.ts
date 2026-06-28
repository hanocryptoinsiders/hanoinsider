import type { ContentItem } from "@/lib/content-types";
import { createAnonClient } from "@/lib/supabase/anon";

/**
 * Public reader: fetch a publicly-shared, published item by slug.
 * Uses the anon key (no cookies) so logged-out visitors can load /share/[slug].
 */
export async function getPublicContentBySlug(slug: string): Promise<ContentItem | null> {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("public_shared_content")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("getPublicContentBySlug failed:", error.message);
      return null;
    }
    return (data as ContentItem | null) ?? null;
  } catch (err) {
    console.error("getPublicContentBySlug error:", err);
    return null;
  }
}
