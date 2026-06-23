"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, ArrowRight, Lock, Search, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { useTier } from "@/lib/tier-context";
import { type ContentItem } from "@/lib/content";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";

const categories = ["All", "Macro", "Bitcoin", "Ethereum", "Altcoins", "Education"];

interface ArticlesClientProps {
  initialArticles: ContentItem[];
}

export function ArticlesClient({ initialArticles }: ArticlesClientProps) {
  const { isFree, upgrade } = useTier();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter items by category tab & search query
  const filteredArticles = initialArticles.filter((item) => {
    const matchesCategory =
      selectedCategory === "All" ||
      item.category?.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featured = filteredArticles[0];
  const items = filteredArticles.slice(1);

  // Popular items sidebar (dynamic or fallback mock)
  const popular = initialArticles
    .slice(0, 4)
    .map((art) => ({ title: art.title, slug: art.slug, views: art.is_premium ? "Premium" : "Free" }));

  return (
      <div className="grid lg:grid-cols-[1fr_300px] gap-5">
        <div className="space-y-5">
          {/* Search */}
          <div className="panel flex items-center gap-3 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articlesâ€¦"
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedCategory(f)}
                className={`rounded-lg px-4 py-2 text-xs transition ${
                  selectedCategory === f ? "bg-foreground text-background" : "panel hover:bg-accent"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {filteredArticles.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No articles found"
              description={
                searchQuery.trim()
                  ? `No articles matched your search query "${searchQuery}". Try editing your search query.`
                  : "We are developing educational blueprints and macro pieces. Check back soon."
              }
            />
          ) : (
            <>
              {featured && (
                <Link href={`/dashboard/articles/${featured.slug}`}>
                  <article className="panel overflow-hidden grid md:grid-cols-2 group cursor-pointer hover:bg-surface-elevated transition border border-foreground/5 hover:border-foreground/15">
                    <div className="relative h-72 md:h-auto bg-secondary/10">
                      {featured.thumbnail_url ? (
                        <img loading="lazy" decoding="async" src={featured.thumbnail_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground/30 font-mono text-xs">
                          No Thumbnail
                        </div>
                      )}
                      {featured.is_premium && (
                        <span className="absolute top-4 left-4 flex items-center gap-1 rounded-md bg-foreground text-background px-2.5 py-1 text-[9px] tracking-wider font-semibold">
                          <Lock className="h-2.5 w-2.5" /> PREMIUM
                        </span>
                      )}
                    </div>
                    <div className="p-8 lg:p-10 flex flex-col justify-center">
                      <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">{featured.category || "Article"} Â· FEATURED</span>
                      <h2 className="font-display mt-4 text-3xl leading-tight text-foreground group-hover:text-[oklch(0.78_0.14_85)] transition-colors">{featured.title}</h2>
                      <p className="mt-4 text-sm text-muted-foreground line-clamp-3">{featured.description}</p>
                      <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {featured.body ? Math.ceil(featured.body.split(/\s+/).length / 200) : 5} min read
                        </span>
                        {featured.published_at && (
                          <span>Â· {new Date(featured.published_at).toLocaleDateString()}</span>
                        )}
                      </div>
                      <span className="mt-6 w-fit inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm group-hover:bg-secondary">
                        Read article <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </article>
                </Link>
              )}

              <div className="grid md:grid-cols-2 gap-5">
                {items.map((a) => {
                  const locked = isFree && a.is_premium;
                  const readingTime = a.body ? Math.ceil(a.body.split(/\s+/).length / 200) : 5;
                  return (
                    <article key={a.id} className="panel overflow-hidden group relative flex flex-col h-full border border-foreground/5 hover:border-foreground/15">
                      <Link href={`/dashboard/articles/${a.slug}`} className="absolute inset-0 z-10" aria-label={a.title} />
                      <div className="relative h-44 bg-secondary/10">
                        {a.thumbnail_url ? (
                          <img
                            loading="lazy"
                            decoding="async"
                            src={a.thumbnail_url}
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
                        {a.is_premium && (
                          <span className="absolute top-3 left-3 flex items-center gap-1 rounded-md bg-foreground text-background px-2 py-0.5 text-[9px] tracking-wider font-semibold z-20">
                            <Lock className="h-2.5 w-2.5" /> PREMIUM
                          </span>
                        )}
                        {locked && (
                          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                            <button
                              onClick={(e) => { e.preventDefault(); upgrade(); }}
                              className="flex items-center gap-2 rounded-md bg-background/85 backdrop-blur px-3 py-2 text-xs pointer-events-auto border border-border/40"
                            >
                              <Lock className="h-3 w-3" /> Premium Lock
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-5 flex flex-col flex-grow">
                        <span className="text-[10px] tracking-wider text-muted-foreground uppercase">{a.category || "Article"}</span>
                        <p className="font-display mt-2 text-xl leading-tight group-hover:text-[oklch(0.78_0.14_85)] transition-colors line-clamp-2">{a.title}</p>
                        
                        {/* Tags */}
                        {a.tags && a.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {a.tags.slice(0, 3).map((t) => (
                              <span key={t} className="text-[9px] font-mono text-muted-foreground/75 px-1.5 py-0.5 rounded bg-secondary/20">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-auto pt-4 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" /> {readingTime} min read Â· {a.published_at ? new Date(a.published_at).toLocaleDateString() : "Draft"}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Popular sidebar */}
        <aside className="space-y-5">
          <section className="panel p-5">
            <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> READ STREAM
            </div>
            <ol className="mt-4 space-y-4">
              {popular.length === 0 ? (
                <p className="text-xs text-muted-foreground font-mono">No trending items.</p>
              ) : (
                popular.map((p, i) => (
                  <li key={p.slug} className="flex gap-3 cursor-pointer group relative">
                    <Link href={`/dashboard/articles/${p.slug}`} className="absolute inset-0" />
                    <span className="font-display text-2xl text-muted-foreground/30 w-6">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm group-hover:text-foreground leading-snug line-clamp-2">{p.title}</p>
                      <p className="text-[9px] font-mono text-muted-foreground/80 mt-1 uppercase">{p.views}</p>
                    </div>
                  </li>
                ))
              )}
            </ol>
          </section>
        </aside>
      </div>
  );
}
