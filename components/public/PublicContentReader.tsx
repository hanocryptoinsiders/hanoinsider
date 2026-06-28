import Link from "next/link";
import { Clock, Gift } from "lucide-react";
import { RichReader } from "@/lib/rich-text";
import { estimateReadingMinutes } from "@/lib/content-body";
import type { ContentItem } from "@/lib/content";

interface PublicContentReaderProps {
  item: ContentItem;
}

export function PublicContentReader({ item }: PublicContentReaderProps) {
  const readingTime = item.body ? estimateReadingMinutes(item.body) : 5;
  const contentLabel =
    item.content_type === "insight"
      ? "Insight"
      : item.content_type === "video"
        ? "Video"
        : "Article";

  return (
    <article>
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium tracking-wide text-emerald-400">
        <Gift className="h-3.5 w-3.5" />
        Free preview — no login required
      </div>

      <header className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch">
        <div className="space-y-5 flex flex-col justify-center">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
              {item.category || contentLabel}
            </span>
            <span className="text-[10px] rounded bg-secondary px-2 py-0.5 font-semibold text-foreground uppercase">
              {contentLabel}
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl leading-[1.05] text-foreground">
            {item.title}
          </h1>

          {item.description && (
            <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-2">
            <span className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-full bg-gradient-to-br from-foreground/30 to-foreground/10 border border-white/10" />
              <span className="text-foreground">The Hano Insiders</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {readingTime} min read
            </span>
            {item.published_at && (
              <span>· {new Date(item.published_at).toLocaleDateString()}</span>
            )}
          </div>

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] font-mono text-muted-foreground/75 px-2 py-0.5 rounded bg-secondary/20"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="relative h-64 lg:h-auto rounded-xl overflow-hidden border border-border bg-secondary/10">
          {item.thumbnail_url ? (
            <img
              loading="eager"
              decoding="async"
              src={item.thumbnail_url}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground/30 font-mono text-xs">
              No Image Provided
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
        </div>
      </header>

      <div className="mt-10">
        {item.content_type === "video" && item.video_url && (
          <div className="mb-8 aspect-video w-full rounded-xl overflow-hidden border border-border bg-black">
            <iframe
              src={item.video_url}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        )}

        <RichReader source={item.body || ""} />
      </div>

      <section className="mt-14 rounded-xl border border-border bg-secondary/10 p-8 text-center">
        <p className="text-[10px] tracking-[0.25em] text-muted-foreground uppercase font-mono">
          Want more like this?
        </p>
        <h2 className="font-display text-2xl sm:text-3xl mt-2 text-foreground">
          Unlock the full Hano Insiders library
        </h2>
        <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Get daily insights, deep-dive articles, and curated market intelligence built for serious beginners.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/#pricing"
            className="inline-flex items-center justify-center rounded-lg bg-foreground text-background font-semibold px-6 py-3 text-sm hover:opacity-90 transition"
          >
            View plans
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm text-foreground hover:bg-secondary/40 transition"
          >
            Member login
          </Link>
        </div>
      </section>
    </article>
  );
}
