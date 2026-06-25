"use client";

import { useState, useEffect } from "react";
import { Check, RotateCcw } from "lucide-react";
import { useQuote, MASCOT_OPTIONS, type MascotId } from "@/lib/quote-context";
import { PageHeader } from "@/components/dashboard/DashboardLayout";

export default function AdminQuote() {
  const q = useQuote();
  const [text, setText] = useState(q.text);
  const [author, setAuthor] = useState(q.author);
  const [mascotId, setMascotId] = useState<MascotId>(q.mascotId);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setText(q.text);
    setAuthor(q.author);
    setMascotId(q.mascotId);
  }, [q.text, q.author, q.mascotId]);

  const dirty = text !== q.text || author !== q.author || mascotId !== q.mascotId;

  const save = () => {
    q.setQuote({ text, author, mascotId });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const previewOpt = MASCOT_OPTIONS.find((m) => m.id === mascotId);
  const previewSrc = previewOpt?.src;
  const previewPos = previewOpt?.objectPosition ?? "50% 20%";

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Desk voice"
        title="Hero quote & mascot"
        desc="The quote and mascot photo shown beneath the dashboard hero. Visible to every member."
      />

      <div className="grid lg:grid-cols-[1fr_360px] gap-5">
        {/* Editor */}
        <div className="panel p-5 sm:p-7 space-y-6">
          <div>
            <label className="text-[11px] tracking-[0.2em] text-muted-foreground">QUOTE TEXT</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={280}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <p className="mt-1 text-[10px] text-muted-foreground text-right">{text.length}/280</p>
          </div>

          <div>
            <label className="text-[11px] tracking-[0.2em] text-muted-foreground">AUTHOR / ATTRIBUTION</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              maxLength={60}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-[11px] tracking-[0.2em] text-muted-foreground">MASCOT PHOTO</label>
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-3">
              {MASCOT_OPTIONS.map((m) => {
                const active = m.id === mascotId;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMascotId(m.id)}
                    title={m.label}
                    className={`relative aspect-[3/4] overflow-hidden rounded-md border transition ${
                      active ? "border-foreground ring-2 ring-foreground/40" : "border-border hover:border-foreground/50"
                    }`}
                  >
                    <img loading="lazy" decoding="async" src={m.src} alt={m.label} className="absolute inset-0 h-full w-full object-cover" />
                    {active && (
                      <div className="absolute top-1.5 right-1.5 rounded-full bg-foreground text-background p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-1.5">
                      <p className="text-[9px] tracking-wider text-foreground/90 truncate">{m.label.split(" - ")[0]}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
            <button
              onClick={save}
              disabled={!dirty}
              className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" /> Save changes
            </button>
            <button
              onClick={() => q.reset()}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <RotateCcw className="h-3 w-3" /> Reset to default
            </button>
            {saved && <span className="text-xs text-success">Saved.</span>}
          </div>
        </div>

        {/* Live preview */}
        <div className="panel p-5 space-y-3">
          <p className="text-[10px] tracking-[0.3em] text-muted-foreground">LIVE PREVIEW</p>
          <div className="panel relative overflow-hidden bg-background">
            <div className="grid grid-cols-[1fr_110px]">
              <div className="relative p-4">
                <p className="font-display text-3xl text-muted-foreground/40 absolute left-2 top-0 leading-none">"</p>
                <blockquote className="font-display text-sm italic leading-snug pl-3">
                  {text || "-"}
</blockquote>
                <p className="mt-3 pl-3 text-[10px] text-muted-foreground tracking-wider">
                  - {author || "Anonymous"}
                </p>
              </div>
              <div className="relative min-h-[120px] overflow-hidden border-l border-border">
                {previewSrc && (
                  <img loading="lazy" decoding="async" src={previewSrc} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: previewPos }} />
                )}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Changes save locally and update the dashboard hero quote for this browser. Wire to your backend later for global persistence.
          </p>
        </div>
      </div>
    </div>
  );
}
