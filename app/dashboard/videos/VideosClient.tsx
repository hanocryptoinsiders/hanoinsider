"use client";

import Link from "next/link";
import { Play, Lock, Clock, Video } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { useTier } from "@/lib/tier-context";
import { type ContentItem } from "@/lib/content";
import { EmptyState } from "@/components/ui/empty-state";

interface VideosClientProps {
  initialVideos: ContentItem[];
}

export function VideosClient({ initialVideos }: VideosClientProps) {
  const { isFree, upgrade } = useTier();
  const featured = initialVideos[0];
  const allVideos = initialVideos.slice(1);

  // Extract duration from tags (e.g. tag "dur:18:42" -> "18:42")
  const getDuration = (item: ContentItem) => {
    const durTag = item.tags?.find((t) => t.startsWith("dur:"));
    return durTag ? durTag.replace("dur:", "") : "15:00";
  };

  const getCleanTags = (item: ContentItem) => {
    return item.tags?.filter((t) => !t.startsWith("dur:")) || [];
  };

  return (
    <>

      {initialVideos.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No videos yet"
          description="We are recording tutorials, webinars, and chart sessions. New video guides will appear here."
        />
      ) : (
        <>
          {featured && (
            <Link href={`/dashboard/videos/${featured.slug}`} className="block">
              <article className="panel overflow-hidden group cursor-pointer border border-foreground/5 hover:border-foreground/15 transition">
                <div className="relative aspect-video bg-black/60">
                  {featured.thumbnail_url ? (
                    <img loading="lazy" decoding="async" src={featured.thumbnail_url} alt="" className="h-full w-full object-cover opacity-80" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground/30 font-mono text-xs">
                      No Thumbnail Image
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="rounded-full bg-foreground text-background h-20 w-20 flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-350">
                      <Play className="h-8 w-8 ml-1" />
                    </span>
                  </div>

                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
                        FEATURED Â· {featured.category || "MARKET REVIEW"}
                      </span>
                      {featured.is_premium && (
                        <span className="flex items-center gap-1 rounded bg-foreground text-background px-1.5 py-0.5 text-[9px] font-bold">
                          <Lock className="h-2 w-2" /> PREMIUM
                        </span>
                      )}
                    </div>
                    <h2 className="font-display mt-2 text-2xl sm:text-3xl text-foreground group-hover:text-[oklch(0.78_0.14_85)] transition-colors">
                      {featured.title}
                    </h2>
                  </div>
                  <span className="absolute bottom-6 right-6 rounded bg-background/80 backdrop-blur px-2 py-0.5 text-xs font-mono text-muted-foreground">
                    {getDuration(featured)}
                  </span>
                </div>
              </article>
            </Link>
          )}

          <div className="space-y-4">
            <p className="text-[11px] tracking-[0.3em] text-muted-foreground">ALL VIDEOS</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {allVideos.map((v) => {
                const locked = isFree && v.is_premium;
                const cleanTags = getCleanTags(v);
                return (
                  <article key={v.id} className="panel overflow-hidden group cursor-pointer relative flex flex-col h-full border border-foreground/5 hover:border-foreground/15">
                    <Link href={`/dashboard/videos/${v.slug}`} className="absolute inset-0 z-10" aria-label={v.title} />
                    <div className="relative aspect-video bg-secondary/15">
                      {v.thumbnail_url ? (
                        <img
                          loading="lazy"
                          decoding="async"
                          src={v.thumbnail_url}
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
                      
                      {v.is_premium && (
                        <span className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-foreground text-background px-2 py-0.5 text-[9px] tracking-wider font-semibold z-20">
                          <Lock className="h-2.5 w-2.5" /> PREMIUM
                        </span>
                      )}
                      
                      {!locked && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="rounded-full bg-background/80 backdrop-blur h-12 w-12 flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition duration-300">
                            <Play className="h-5 w-5 ml-0.5" />
                          </span>
                        </span>
                      )}
                      
                      {locked && (
                        <button
                          onClick={(e) => { e.preventDefault(); upgrade(); }}
                          className="absolute inset-0 flex items-center justify-center z-20 pointer-events-auto"
                        >
                          <span className="flex items-center gap-2 rounded-md bg-background/85 backdrop-blur px-3 py-2 text-xs border border-border/40">
                            <Lock className="h-3 w-3" /> Premium Lock
                          </span>
                        </button>
                      )}
                      
                      <span className="absolute bottom-2 right-2 rounded bg-background/80 backdrop-blur px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                        {getDuration(v)}
                      </span>
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <span className="text-[10px] tracking-wider text-muted-foreground uppercase">{v.category || "Video"}</span>
                      <p className="font-display mt-1 text-base leading-tight group-hover:text-[oklch(0.78_0.14_85)] transition-colors line-clamp-2">{v.title}</p>
                      
                      {/* Video Tags */}
                      {cleanTags.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {cleanTags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[9px] font-mono text-muted-foreground/75 px-1.5 py-0.5 rounded bg-secondary/20">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="mt-auto pt-3.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> {getDuration(v)} <span className="opacity-50">Â·</span> {v.published_at ? new Date(v.published_at).toLocaleDateString() : "Draft"}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
