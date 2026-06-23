"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Lock, Clock, Bookmark, Pin, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { useTier } from "@/lib/tier-context";
import { type ContentItem } from "@/lib/content";
import { EmptyState } from "@/components/ui/empty-state";
import { Lightbulb } from "lucide-react";

const categories = ["All", "Macro", "On-chain", "Bitcoin", "Ethereum", "Altcoins", "Trading"];

interface InsightsClientProps {
  initialInsights: ContentItem[];
}

export function InsightsClient({ initialInsights }: InsightsClientProps) {
  const { isFree, upgrade } = useTier();
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState("All");

  const toggle = (id: string) => setMarked((m) => ({ ...m, [id]: !m[id] }));

  // Filter items by category tab
  const filteredInsights = initialInsights.filter((item) => {
    if (selectedCategory === "All") return true;
    return item.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  // The first insight acts as the Featured hero piece
  const featured = filteredInsights[0];
  const items = filteredInsights.slice(1);

  return (
    <>

      {initialInsights.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No insights yet"
          description="We are scanning the markets. New insights will appear here as soon as opportunities develop."
        />
      ) : (
        <>
          {featured && (
            <Link href={`/dashboard/insights/${featured.slug}`} className="block">
              <article className="panel-elevated overflow-hidden grid md:grid-cols-[1.2fr_1fr] cursor-pointer group border border-foreground/15 hover:border-foreground/30 transition">
                <div className="relative h-64 md:h-auto bg-secondary/10">
                  {featured.thumbnail_url ? (
                    <img loading="lazy" decoding="async" src={featured.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground/40 font-mono text-xs">
                      No Thumbnail Image
                    </div>
                  )}
                  <span className="absolute top-4 left-4 flex items-center gap-1.5 rounded-md bg-[oklch(0.78_0.14_85)] text-background px-3 py-1 text-[10px] tracking-wider font-semibold">
                    <Pin className="h-3 w-3" /> FEATURED
                  </span>
                  {featured.is_premium && (
                    <span className="absolute top-4 right-4 flex items-center gap-1 rounded-md bg-foreground text-background px-2.5 py-1 text-[9px] tracking-wider font-semibold">
                      <Lock className="h-2.5 w-2.5" /> PREMIUM
                    </span>
                  )}
                </div>
                <div className="p-6 sm:p-10 flex flex-col justify-center">
                  <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">{featured.category || "Insight"}</span>
                  <h2 className="font-display mt-3 text-2xl sm:text-3xl leading-tight text-foreground group-hover:text-[oklch(0.78_0.14_85)] transition-colors">{featured.title}</h2>
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{featured.description}</p>
                  <div className="mt-5 flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                    <span className="rounded bg-secondary px-2 py-0.5 text-foreground font-medium">By The Hano Insiders</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {featured.body ? Math.ceil(featured.body.split(/\s+/).length / 200) : 1} min read
                    </span>
                    {featured.published_at && (
                      <span>Â· {new Date(featured.published_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  <span className="mt-6 w-fit inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm hover:opacity-90 transition">
                    Read full insight <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </article>
            </Link>
          )}

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-4 py-2 text-xs transition ${
                  selectedCategory === cat ? "bg-foreground text-background" : "panel hover:bg-accent"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredInsights.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title={`No ${selectedCategory} insights`}
              description={`There are currently no insights tagged under ${selectedCategory}. Try another category pill.`}
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((it) => {
                const locked = isFree && it.is_premium;
                const readingTime = it.body ? Math.ceil(it.body.split(/\s+/).length / 200) : 1;
                return (
                  <article key={it.id} className="panel overflow-hidden group relative flex flex-col h-full">
                    <Link href={`/dashboard/insights/${it.slug}`} className="absolute inset-0 z-10" aria-label={it.title} />
                    <div className="relative h-44 overflow-hidden bg-secondary/15">
                      {it.thumbnail_url ? (
                        <img
                          loading="lazy"
                          decoding="async"
                          src={it.thumbnail_url}
                          alt=""
                          className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${
                            locked ? "blur-md opacity-60" : ""
                          }`}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground/30 font-mono text-xs">
                          No Thumbnail
                        </div>
                      )}
                      <span className="absolute top-3 left-3 rounded-md bg-background/80 backdrop-blur px-3 py-1 text-[10px] tracking-wider uppercase">
                        {it.category || "Insight"}
                      </span>
                      {it.is_premium && (
                        <span className="absolute top-3 right-12 flex items-center gap-1 rounded-md bg-foreground text-background px-2 py-0.5 text-[9px] tracking-wider font-semibold">
                          <Lock className="h-2.5 w-2.5" /> PREMIUM
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggle(it.id);
                        }}
                        className={`absolute z-20 top-3 right-3 rounded-lg backdrop-blur p-1.5 transition ${
                          marked[it.id] ? "bg-foreground text-background" : "bg-background/80 hover:bg-background"
                        }`}
                        aria-label="Bookmark"
                      >
                        <Bookmark className={`h-3.5 w-3.5 ${marked[it.id] ? "fill-current" : ""}`} />
                      </button>
                      {locked && (
                        <div className="absolute z-20 inset-0 flex items-center justify-center pointer-events-none">
                          <div className="flex flex-col items-center gap-2 rounded-md bg-background/85 backdrop-blur px-4 py-3 pointer-events-auto shadow-lg border border-border/40">
                            <Lock className="h-4 w-4 text-foreground/80" />
                            <button onClick={(e) => { e.preventDefault(); upgrade(); }} className="text-[10px] underline font-medium">Upgrade to read</button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-grow">
                      <p className="font-display text-lg leading-tight group-hover:text-[oklch(0.78_0.14_85)] transition-colors line-clamp-2">{it.title}</p>
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{it.description}</p>
                      
                      {/* Tags */}
                      {it.tags && it.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {it.tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-[9px] font-mono text-muted-foreground/75 px-1.5 py-0.5 rounded bg-secondary/20">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-auto pt-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-foreground font-medium">By The Hano Insiders</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {readingTime} min read
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{it.published_at ? new Date(it.published_at).toLocaleDateString() : "Draft"}</span>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" /> 0
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" /> 0
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
