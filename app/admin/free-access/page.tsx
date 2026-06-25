"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { useFreeAccess, CATALOGS, type Section } from "@/lib/free-access-context";
import { INSIGHT_CATALOG, ARTICLE_CATALOG, VIDEO_CATALOG } from "@/lib/content-catalog";
import { ArrowUp, ArrowDown, Plus, Trash2, Star, RotateCcw, Eye, EyeOff, Lock, Unlock } from "lucide-react";

type SlotKey = Section | "homeInsights";
const SECTIONS: { key: SlotKey; label: string; catalog: typeof INSIGHT_CATALOG; helper: string }[] = [
  { key: "homeInsights", label: "Dashboard Home  Recent Insights", catalog: INSIGHT_CATALOG, helper: "Shown in the right rail on /dashboard." },
  { key: "insights", label: "Insights Page", catalog: INSIGHT_CATALOG, helper: "Items visible on /dashboard/insights for free users." },
  { key: "articles", label: "Articles Page", catalog: ARTICLE_CATALOG, helper: "Items visible on /dashboard/articles for free users." },
  { key: "videos", label: "Videos Page", catalog: VIDEO_CATALOG, helper: "Items visible on /dashboard/videos for free users." },
];

export default function FreeAccess() {
  const fa = useFreeAccess();
  const [tab, setTab] = useState<"free" | "premium" | "global">("free");

  return (
    <>
      <PageHeader kicker="FREE ACCESS CONTROL" title="Curate what free users see." desc="Pick the exact items free members can read, watch, or preview. Everything else stays locked behind upgrade. Premium members always see everything." />

      <div className="panel p-1 inline-flex gap-1 text-xs">
        {([
          { id: "free", label: "Free Slots", icon: Unlock },
          { id: "premium", label: "Premium Featured", icon: Star },
          { id: "global", label: "Global Limits", icon: Lock },
        ] as const).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 rounded-md px-3 py-2 ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "global" && <GlobalLimits />}
      {tab === "free" && (
        <div className="space-y-5">
          {SECTIONS.map((s) => (
            <SectionEditor key={s.key} slotKey={s.key} label={s.label} catalog={s.catalog} helper={s.helper} />
          ))}
          <MarketPreviewToggle />
          <div className="panel p-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Reset all Free Access settings to defaults.</p>
            <button onClick={fa.reset} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>
      )}
      {tab === "premium" && <PremiumFeaturedEditor />}
    </>
  );
}

function GlobalLimits() {
  const fa = useFreeAccess();
  const rows: { key: SlotKey; label: string }[] = [
    { key: "homeInsights", label: "Dashboard home insights" },
    { key: "insights", label: "Insights page" },
    { key: "articles", label: "Articles page" },
    { key: "videos", label: "Videos page" },
  ];
  return (
    <div className="panel p-5 space-y-4">
      <p className="text-[11px] tracking-[0.3em] text-muted-foreground">FREE CONTENT LIMITS</p>
      <p className="text-xs text-muted-foreground">Max number of items free users can see per section. Slots above the limit will stay locked even if filled.</p>
      <div className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm">{r.label}</p>
              <p className="text-[10px] text-muted-foreground">Currently {fa.state.slots[r.key].filter((x) => x.active).length} active slots</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => fa.setLimit(r.key, fa.state.limits[r.key] - 1)} className="rounded-md border border-border w-8 h-8">��</button>
              <input type="number" min={0} max={20} value={fa.state.limits[r.key]} onChange={(e) => fa.setLimit(r.key, Number(e.target.value))} className="w-16 text-center rounded-md border border-border bg-transparent px-2 py-1.5 text-sm" />
              <button onClick={() => fa.setLimit(r.key, fa.state.limits[r.key] + 1)} className="rounded-md border border-border w-8 h-8">+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketPreviewToggle() {
  const fa = useFreeAccess();
  return (
    <div className="panel p-5 flex items-start justify-between gap-4 flex-wrap">
      <div>
        <p className="text-sm">Free Market Preview</p>
        <p className="text-[11px] text-muted-foreground mt-1">When ON, free users can preview the market stats grid on /dashboard/market. When OFF (default), the grid is locked with an upgrade overlay.</p>
      </div>
      <button onClick={() => fa.setMarketPreview(!fa.state.marketPreview)} className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${fa.state.marketPreview ? "bg-foreground text-background" : "border border-border"}`}>
        {fa.state.marketPreview ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
        {fa.state.marketPreview ? "Enabled" : "Disabled"}
      </button>
    </div>
  );
}

function SectionEditor({ slotKey, label, catalog, helper }: { slotKey: SlotKey; label: string; catalog: typeof INSIGHT_CATALOG; helper: string }) {
  const fa = useFreeAccess();
  const slots = fa.state.slots[slotKey];
  const limit = fa.state.limits[slotKey];
  const used = slots.length;

  const available = catalog.filter((c) => !slots.some((s) => s.id === c.id));
  const [pick, setPick] = useState("");

  return (
    <section className="panel p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-display text-xl">{label}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{helper}</p>
        </div>
        <div className="text-[11px] text-muted-foreground">
          <span className={used > limit ? "text-destructive" : ""}>{Math.min(used, limit)} of {limit} visible</span>
          {used > limit && <span className="ml-2">({used - limit} slot{used - limit > 1 ? "s" : ""} over limit)</span>}
        </div>
      </div>

      <div className="space-y-2">
        {slots.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-3 py-6 border border-dashed border-border rounded-md text-center">No free slots configured. Free users will see nothing in this section.</p>
        )}
        {slots.map((slot, idx) => {
          const item = catalog.find((c) => c.id === slot.id);
          const overLimit = idx >= limit;
          return (
            <div key={`${slot.id}-${idx}`} className={`flex items-center gap-3 rounded-md border border-border p-2 ${overLimit ? "opacity-50" : ""} ${!slot.active ? "bg-secondary/40" : ""}`}>
              <span className="text-[10px] tracking-wider text-muted-foreground w-12 text-center">SLOT {idx + 1}</span>
              {item ? (
                <>
                  <img loading="lazy" decoding="async" src={item.img} alt="" className="h-10 w-14 object-cover rounded shrink-0" />
                  <select
                    value={slot.id}
                    onChange={(e) => fa.replaceSlot(slotKey, idx, e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none truncate"
                  >
                    {catalog.map((c) => (
                      <option key={c.id} value={c.id} disabled={slots.some((s, j) => j !== idx && s.id === c.id)}>
                        {c.title.slice(0, 60)}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <span className="flex-1 text-xs text-muted-foreground italic">Missing item</span>
              )}
              <div className="flex items-center gap-1">
                <button onClick={() => fa.moveSlot(slotKey, idx, -1)} disabled={idx === 0} className="rounded p-1.5 hover:bg-accent disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button onClick={() => fa.moveSlot(slotKey, idx, 1)} disabled={idx === slots.length - 1} className="rounded p-1.5 hover:bg-accent disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                <button onClick={() => fa.toggleActive(slotKey, idx)} className="rounded p-1.5 hover:bg-accent" aria-label="Toggle active">
                  {slot.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
                <button onClick={() => fa.removeSlot(slotKey, idx)} className="rounded p-1.5 hover:bg-destructive/20 text-destructive" aria-label="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          );
        })}
      </div>

      {available.length > 0 && (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <select value={pick} onChange={(e) => setPick(e.target.value)} className="flex-1 min-w-0 rounded-md border border-border bg-transparent px-3 py-2 text-sm">
            <option value="">Add an item to free slots&</option>
            {available.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button
            onClick={() => { if (pick) { fa.addSlot(slotKey, pick); setPick(""); } }}
            disabled={!pick}
            className="flex items-center gap-1 rounded-md bg-foreground text-background px-3 py-2 text-xs disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" /> Add Slot
          </button>
        </div>
      )}
    </section>
  );
}

function PremiumFeaturedEditor() {
  const fa = useFreeAccess();
  const sections: { key: Section; label: string }[] = [
    { key: "insights", label: "Insights" },
    { key: "articles", label: "Articles" },
    { key: "videos", label: "Videos" },
  ];

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <p className="text-[11px] tracking-[0.3em] text-muted-foreground">PREMIUM FEATURED</p>
        <p className="text-xs text-muted-foreground mt-2">Star items here to pin them as featured for premium members. Featured items render with a gold accent badge across the platform. Premium users see everything either way  this is purely curation.</p>
      </div>
      {sections.map((s) => {
        const catalog = CATALOGS[s.key];
        const featured = fa.state.premiumFeatured[s.key];
        return (
          <section key={s.key} className="panel p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-display text-xl">{s.label}</p>
              <span className="text-[11px] text-muted-foreground">{featured.length} featured</span>
            </div>
            <div className="grid md:grid-cols-2 gap-2">
              {catalog.map((item) => {
                const on = fa.isPremiumFeatured(s.key, item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => fa.togglePremiumFeatured(s.key, item.id)}
                    className={`flex items-center gap-3 rounded-md border p-2 text-left transition ${on ? "border-[oklch(0.78_0.14_85)] bg-[oklch(0.78_0.14_85)]/10" : "border-border hover:bg-accent/40"}`}
                  >
                    <img loading="lazy" decoding="async" src={item.img} alt="" className="h-10 w-14 object-cover rounded shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">{item.tag}</p>
                    </div>
                    <Star className={`h-4 w-4 shrink-0 ${on ? "fill-[oklch(0.78_0.14_85)] text-[oklch(0.78_0.14_85)]" : "text-muted-foreground"}`} />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
