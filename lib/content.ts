"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin, getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
  is_public?: boolean;
  status: "draft" | "published" | "archived";
  video_url: string | null;
  related_coin_slug?: string | null;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// ������ Helpers ������������������������������������������������������������������������������������������������������������������

export async function isPremiumUser(): Promise<boolean> {
  const profile = await getCurrentProfile();
  if (!profile) return false;
  return (
    profile.is_premium === true ||
    profile.role === "premium" ||
    profile.role === "admin"
  );
}

export async function canViewFullContent(item: { is_premium: boolean }): Promise<boolean> {
  if (!item.is_premium) return true;
  return await isPremiumUser();
}

// ������ Queries (Readable by users/admins based on status) ����������������������������

/**
 * Fetches content items list.
 * Admins get draft + archived items from `content_items` table.
 * Normal users get published items from `published_content` view.
 */
export async function getContentItems(type?: "insight" | "article" | "video", adminMode = false): Promise<ContentItem[]> {
  const supabase = await createClient();

  const columns =
    "id, title, slug, description, thumbnail_url, content_type, category, tags, is_premium, is_public, status, published_at, created_at, related_coin_slug";

  if (adminMode) {
    // 1. Double check admin privilege on the server
    await requireAdmin();
    
    let query = supabase.from("content_items").select(columns).order("created_at", { ascending: false });
    if (type) {
      query = query.eq("content_type", type);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as ContentItem[];
  } else {
    // Fetch only published content from the public view (enforces database-level field masking)
    let query = supabase.from("published_content").select(columns).order("published_at", { ascending: false });
    if (type) {
      query = query.eq("content_type", type);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as ContentItem[];
  }
}

/**
 * Fetches a single content item by its slug.
 * Admins query the core table. Normal users query the public view.
 */
export async function getContentBySlug(slug: string, adminMode = false): Promise<ContentItem | null> {
  const supabase = await createClient();

  if (adminMode) {
    await requireAdmin();
    const { data, error } = await supabase
      .from("content_items")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as ContentItem | null;
  } else {
    // Query published_content view
    const { data, error } = await supabase
      .from("published_content")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as ContentItem | null;
  }
}

// ������ Mutation Server Actions (Strict Admin Only) ����������������������������������������������

export async function createContentItem(data: Omit<ContentItem, "id" | "created_at" | "updated_at">): Promise<ContentItem> {
  const { user } = await requireAdmin();
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("content_items")
    .insert([
      {
        ...data,
        author_id: user.id,
        published_at: data.status === "published" ? new Date().toISOString() : data.published_at,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/content");
  revalidatePath(`/dashboard/${data.content_type}s`);
  return item as ContentItem;
}

export async function updateContentItem(id: string, data: Partial<ContentItem>): Promise<ContentItem> {
  await requireAdmin();
  const supabase = await createClient();

  const updatePayload: any = { ...data };
  delete updatePayload.is_public;
  if (data.status === "published" && !data.published_at) {
    updatePayload.published_at = new Date().toISOString();
  }

  const { data: item, error } = await supabase
    .from("content_items")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/content");
  revalidatePath(`/dashboard/${item.content_type}s`);
  revalidatePath(`/dashboard/${item.content_type}s/${item.slug}`);
  return item as ContentItem;
}

export async function deleteContentItem(id: string, contentType: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("content_items").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/content");
  revalidatePath(`/dashboard/${contentType}s`);
}

export async function publishContentItem(id: string, contentType: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("content_items")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/content");
  revalidatePath(`/dashboard/${contentType}s`);
}

export async function archiveContentItem(id: string, contentType: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("content_items")
    .update({ status: "archived", is_public: false })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/content");
  revalidatePath(`/dashboard/${contentType}s`);
}

export async function togglePremiumContent(id: string, currentlyPremium: boolean, contentType: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("content_items")
    .update({ is_premium: !currentlyPremium })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/content");
  revalidatePath(`/dashboard/${contentType}s`);
}

/**
 * Fetches a publicly shared content item by slug.
 * Works for anonymous visitors via the public_shared_content view.
 */
export async function getPublicSharedContentBySlug(slug: string): Promise<ContentItem | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("public_shared_content")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as ContentItem | null;
}

/**
 * Admin-only: toggle whether a published item is publicly shareable at /share/[slug].
 */
export async function togglePublicContent(
  id: string,
  slug: string,
  currentlyPublic: boolean,
  contentType: string,
): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("content_items")
    .update({ is_public: !currentlyPublic })
    .eq("id", id)
    .eq("status", "published");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/content");
  revalidatePath(`/dashboard/${contentType}s`);
  revalidatePath(`/share/${slug}`);
}

