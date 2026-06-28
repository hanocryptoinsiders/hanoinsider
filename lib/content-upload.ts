"use server";

import { requireAdmin } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase/service";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const BUCKET = "content-images";

export type UploadThumbnailResult =
  | { success: true; url: string }
  | { success: false; error: string };

type UploadFolder = "thumbnails" | "inline";

function extForMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

/**
 * Admin-only image upload via service role. Never exposes the service key
 * to the browser — the client sends FormData to this server action.
 */
export async function uploadContentImage(
  formData: FormData,
  folder: UploadFolder = "thumbnails",
): Promise<UploadThumbnailResult> {
  try {
    await requireAdmin();
  } catch {
    return { success: false, error: "Unauthorized" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "No file provided" };
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return { success: false, error: "Unsupported file type. Use JPG, PNG, or WebP." };
  }

  if (file.size > MAX_BYTES) {
    return { success: false, error: "File too large. Maximum size is 5 MB." };
  }

  const ext = extForMime(file.type);
  const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = getServiceSupabase();
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
    cacheControl: "3600",
  });

  if (uploadError) {
    console.error("[content-upload] storage error:", uploadError.message);
    return { success: false, error: uploadError.message || "Upload failed" };
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!publicData?.publicUrl) {
    return { success: false, error: "Could not resolve public URL for uploaded image" };
  }

  return { success: true, url: publicData.publicUrl };
}

/** @deprecated Use uploadContentImage(formData, "thumbnails") */
export async function uploadContentThumbnail(formData: FormData): Promise<UploadThumbnailResult> {
  return uploadContentImage(formData, "thumbnails");
}
