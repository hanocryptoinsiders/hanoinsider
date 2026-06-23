import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getContentBySlug } from "@/lib/content";
import ContentReaderDisplay from "@/components/dashboard/ContentReader";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const profile = await getCurrentProfile();

  const isAdmin = profile?.role === "admin";
  const isPremiumOrAdmin =
    isAdmin ||
    profile?.is_premium === true ||
    profile?.role === "premium";

  const item = await getContentBySlug(slug, isAdmin);

  if (!item) notFound();
  if (!isAdmin && item.status !== "published") notFound();

  const locked = item.is_premium && !isPremiumOrAdmin;

  return (
    <ContentReaderDisplay
      item={item}
      locked={locked}
      contentType="article"
    />
  );
}
