"use client";

import React, { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Heart, MessageCircle, Bookmark, Lock } from "lucide-react";
import { CATALOGS, type Section } from "@/lib/content-catalog";
import { RichReader } from "@/lib/rich-text";
import { useTier } from "@/lib/tier-context";

export default function ReaderPage({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = React.use(params);
  if (!(section in CATALOGS)) notFound();
  const item = CATALOGS[section as Section].find((c) => c.id === id);
  if (!item) notFound();

  const { isFree, upgrade } = useTier();
  const locked = isFree && section !== "videos";

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const backTo = section === "insights" ? "/dashboard/insights" : "/dashboard/articles";

  return (
    <article className="-mt-2">
      <Link href={backTo} className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to {section}
      </Link>

      {/* Hero */}
      <header className="mt-6 grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch">
        <div className="space-y-5">
          <span className="text-[10px] tracking-[0.3em] text-muted-foreground">{item.tag}</span>
          <h1 className="font-display text-3xl sm:text-5xl leading-[1.05]">{item.title}</h1>
          {item.body && <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">{item.body}</p>}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-2">
            <span className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-full bg-gradient-to-br from-foreground/30 to-foreground/10 border border-white/10" />
              <span className="text-foreground">{item.author ?? "The Hano Insiders"}</span>
            </span>
            {item.read && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {item.read} read</span>}
            {(item.date || item.time) && <span>· {item.date ?? item.time}</span>}
          </div>
        </div>
        <div className="relative h-64 lg:h-auto rounded-xl overflow-hidden border border-border">
          <img loading="lazy" decoding="async" src={item.img} alt={item.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
        </div>
      </header>

      {/* Action bar */}
      <div className="mt-8 flex items-center justify-between border-y border-border py-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setLiked((v) => !v)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs hover:bg-accent ${liked ? "text-[oklch(0.78_0.14_85)]" : "text-muted-foreground"}`}>
            <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} /> {(item.likes ?? 0) + (liked ? 1 : 0)}
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent">
            <MessageCircle className="h-3.5 w-3.5" /> {item.comments ?? 0}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setSaved((v) => !v)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs hover:bg-accent ${saved ? "text-foreground" : "text-muted-foreground"}`}>
            <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} /> {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="mt-10 grid lg:grid-cols-[minmax(0,_720px)_1fr] gap-10">
        <div className="relative">
          {locked ? (
            <>
              <div className="pointer-events-none select-none blur-md opacity-50">
                <RichReader source={item.content ?? ""} />
              </div>
              <div className="absolute inset-0 flex items-start justify-center pt-20">
                <div className="panel-elevated p-8 text-center max-w-md">
                  <Lock className="h-5 w-5 mx-auto text-muted-foreground" />
                  <h3 className="font-display text-2xl mt-3">Members only</h3>
                  <p className="mt-2 text-sm text-muted-foreground">This piece is part of the premium intelligence stream. Unlock the full reader, member dashboard, and the live dashboard.</p>
                  <button onClick={upgrade} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm">
                    Unlock with Premium
                  </button>
                </div>
              </div>
            </>
          ) : (
            <RichReader source={item.content ?? ""} />
          )}
        </div>

        {/* Related */}
        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <p className="text-[11px] tracking-[0.3em] text-muted-foreground">RELATED</p>
          {CATALOGS[section as Section].filter((c) => c.id !== item.id).slice(0, 4).map((c) => (
            <Link key={c.id} href={`/dashboard/read/${section}/${c.id}`} className="flex gap-3 panel p-3 hover:bg-surface-elevated transition">
              <img loading="lazy" decoding="async" src={c.img} alt="" className="h-16 w-16 rounded-md object-cover shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] tracking-wider text-muted-foreground">{c.tag}</p>
                <p className="font-display text-sm mt-1 leading-tight line-clamp-2">{c.title}</p>
              </div>
            </Link>
          ))}
        </aside>
      </div>
    </article>
  );
}
