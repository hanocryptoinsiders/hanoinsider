import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getContentBySlug } from "@/lib/content";
import ContentReaderDisplay from "@/components/dashboard/ContentReader";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function InsightDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // Fetch the authenticated user's profile server-side
  const profile = await getCurrentProfile();

  // Determine if the user has premium or admin access
  const isAdmin = profile?.role === "admin";
  const isPremiumOrAdmin =
    isAdmin ||
    profile?.is_premium === true ||
    profile?.role === "premium";

  // Admins query the raw table (sees drafts/archived). Everyone else uses the published view.
  const item = await getContentBySlug(slug, isAdmin);

  // 404 if not found, or if non-admin tries to access a non-published item
  if (!item) notFound();
  if (!isAdmin && item.status !== "published") notFound();

  // Determine locked state server-side — NOT client-side
  // For free users visiting premium content: body/video_url is already NULL from the DB view.
  // The `locked` flag tells the UI to show the upgrade CTA instead of empty content.
  const locked = item.is_premium && !isPremiumOrAdmin;

  return (
    <ContentReaderDisplay
      item={item}
      locked={locked}
      contentType="insight"
    />
  );
}
