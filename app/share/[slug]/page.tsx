import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";
import { PublicContentReader } from "@/components/public/PublicContentReader";
import { getPublicSharedContentBySlug } from "@/lib/content";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublicSharedContentBySlug(slug);

  if (!item) {
    return { title: "Content not found | Hano Insiders" };
  }

  return {
    title: `${item.title} | Hano Insiders`,
    description: item.description || "Free crypto intelligence from Hano Insiders.",
    openGraph: {
      title: item.title,
      description: item.description || undefined,
      type: "article",
      images: item.thumbnail_url ? [{ url: item.thumbnail_url }] : undefined,
    },
    twitter: {
      card: item.thumbnail_url ? "summary_large_image" : "summary",
      title: item.title,
      description: item.description || undefined,
      images: item.thumbnail_url ? [item.thumbnail_url] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function PublicSharePage({ params }: PageProps) {
  const { slug } = await params;
  const item = await getPublicSharedContentBySlug(slug);

  if (!item) notFound();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="topbar border-b border-border/60">
        <div className="topbar-inner max-w-5xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 py-1">
            <LogoMark size={32} />
          </Link>
          <div className="topbar-actions">
            <Link href="/login" className="topbar-action topbar-action--plain">
              Log In
            </Link>
            <Link href="/#pricing" className="topbar-cta-btn">
              Get Started <span className="arr">→</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <PublicContentReader item={item} />
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Hano Insiders. All rights reserved.</p>
      </footer>
    </div>
  );
}
