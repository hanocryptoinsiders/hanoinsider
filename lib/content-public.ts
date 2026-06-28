import { createClient } from "@supabase/supabase-js";

/** Shape returned by the public_shared_content view (no auth required). */
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

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Fetches publicly shared content for anonymous visitors.
 * Uses a cookie-less anon client so /share works without login.
 */
export async function getPublicSharedContentBySlug(
  slug: string,
): Promise<PublicSharedContent | null> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("public_shared_content")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[getPublicSharedContentBySlug]", error.message);
    return null;
  }

  return data as PublicSharedContent | null;
}
