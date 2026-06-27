import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock } from "lucide-react";
import { getPublicContentBySlug } from "@/lib/content";
import { RichReader } from "@/lib/rich-text";
import { HanoWordmark } from "@/components/brand/HanoWordmark";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublicContentBySlug(slug);

  if (!item) {
    return {
      title: "Content not found · Hano Insiders",
      robots: { index: false, follow: false },
    };
  }

  const title = `${item.title} · Hano Insiders`;
  const description =
    item.description ||
    `Read "${item.title}" — shared publicly by Hano Insiders.`;

  return {
    title,
    description,
    alternates: { canonical: `/share/${item.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/share/${item.slug}`,
      images: item.thumbnail_url ? [{ url: item.thumbnail_url }] : undefined,
      publishedTime: item.published_at || undefined,
    },
    twitter: {
      card: item.thumbnail_url ? "summary_large_image" : "summary",
      title,
      description,
      images: item.thumbnail_url ? [item.thumbnail_url] : undefined,
    },
  };
}

export default async function PublicSharePage({ params }: PageProps) {
  const { slug } = await params;
  const item = await getPublicContentBySlug(slug);

  // Anything that is missing, private, unpublished, or draft resolves to 404.
  if (!item) notFound();

  const readingTime = item.body ? Math.max(1, Math.ceil(item.body.split(/\s+/).length / 200)) : 3;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <HanoWordmark href="/" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            Visit Hano Insiders <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <article>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {item.category || item.content_type}
            </span>
            <span className="rounded bg-secondary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-foreground">
              {item.content_type}
            </span>
          </div>

          <h1 className="mt-4 font-display text-3xl leading-[1.1] sm:text-5xl">{item.title}</h1>

          {item.description && (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="text-foreground">The Hano Insiders</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {readingTime} min read
            </span>
            {item.published_at && <span>· {new Date(item.published_at).toLocaleDateString()}</span>}
          </div>

          {item.thumbnail_url && (
            <img
              src={item.thumbnail_url}
              alt={item.title}
              loading="lazy"
              decoding="async"
              className="mt-8 h-64 w-full rounded-xl border border-border object-cover sm:h-80"
            />
          )}

          {item.content_type === "video" && item.video_url && (
            <div className="mt-8 aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
              <iframe
                src={item.video_url}
                title={item.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
          )}

          <div className="mt-10 border-t border-border/40 pt-8">
            <RichReader source={item.body || ""} />
          </div>

          {item.tags && item.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <span
                  key={t}
                  className="rounded bg-secondary/20 px-2 py-0.5 font-mono text-[10px] text-muted-foreground/75"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </article>

        <section className="mt-14 rounded-2xl border border-border bg-secondary/10 p-6 text-center sm:p-8">
          <h2 className="font-display text-xl sm:text-2xl">Want the full Hano Insiders desk?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Curated market context, educational insights, and short analysis for serious beginners.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Explore Hano Insiders <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <footer className="mt-12 border-t border-border/60 pt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Hano Insiders provides educational content and market analysis only. Nothing here is financial advice.
        </footer>
      </main>
    </div>
  );
}
