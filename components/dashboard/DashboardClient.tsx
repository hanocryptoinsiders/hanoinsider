"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Lock, Pin, TrendingUp, TrendingDown, Activity, Send } from "lucide-react";
import { useQuote } from "@/lib/quote-context";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { LockOverlay } from "@/components/dashboard/LockOverlay";
import { useTier } from "@/lib/tier-context";
import { useFreeAccess } from "@/lib/free-access-context";
import { useMarketSnapshot, useCoinHistory, fmtUsd, fmtPct } from "@/lib/market-hooks";
import { CoinLogo } from "@/components/CoinLogo";
import type { ContentItem } from "@/lib/content";
import type { MarketSnapshot } from "@/lib/market.functions";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";

function DashboardChart({ points, height = 150, isUp = true }: { points: number[]; height?: number; isUp?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ height }} className="w-full bg-zinc-950/20 animate-pulse rounded-xl" />;
  }

  const data = points && points.length > 1 
    ? points.map((val, idx) => ({ name: idx, value: val }))
    : [40, 38, 42, 39, 45, 41, 48, 46, 52, 50, 55].map((val, idx) => ({ name: idx, value: val }));

  const strokeColor = isUp ? "oklch(0.78 0.18 150)" : "oklch(0.62 0.22 25)";
  const fillId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div style={{ width: "100%", height }} className="relative select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Tooltip
            cursor={{ stroke: "rgba(255, 255, 255, 0.08)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border border-border/80 bg-zinc-950 px-2.5 py-1.5 text-xs shadow-2xl">
                    <p className="font-mono font-medium text-foreground">
                      ${(payload[0].value as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={1.5}
            fillOpacity={1}
            fill={`url(#${fillId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DashboardClientProps {
  initialInsights: ContentItem[];
  initialSnap: MarketSnapshot;
  fngData: {
    value: string;
    value_classification: string;
  } | null;
  heroBanner?: React.ReactNode;
}

export function DashboardClient({ initialInsights, initialSnap, fngData, heroBanner }: DashboardClientProps) {
  const { isFree, upgrade } = useTier();
  const fa = useFreeAccess();
  const quote = useQuote();

  // Clean up any stale checkout flags on mount
  useEffect(() => {
    localStorage.removeItem("hano_checkout");
  }, []);

  const { data: snap } = useMarketSnapshot(initialSnap);

  const [btcTimeframe, setBtcTimeframe] = useState("24H");
  const { data: btcPoints } = useCoinHistory("BTC", btcTimeframe);
  const { data: mcapPoints } = useCoinHistory("BTC", "24H");

  const g = snap?.global;
  const btc = snap?.top.find((c) => c.symbol === "BTC");
  const eth = snap?.top.find((c) => c.symbol === "ETH");
  const gainers = (snap?.top ?? [])
    .slice()
    .sort((a, b) => b.percentChange24h - a.percentChange24h)
    .slice(0, 3);
  
  const topNarrative = gainers[0] ? `${gainers[0].symbol}` : "—";
  const topNarrativeChg = gainers[0] ? `+${gainers[0].percentChange24h.toFixed(1)}% 24h` : "—";

  const totalMcap = g ? fmtUsd(g.totalMarketCap, { compact: true }) : "—";
  const totalMcapChg = g ? fmtPct(g.marketCapChange24h) : "—";
  const totalMcapPos = (g?.marketCapChange24h ?? 0) >= 0;
  const btcDom = g ? `${g.btcDominance.toFixed(2)}%` : "—";
  const vol24 = g ? fmtUsd(g.totalVolume24h, { compact: true }) : "—";
  const btcPrice = btc ? fmtUsd(btc.price) : "—";
  const btcChg = btc ? fmtPct(btc.percentChange24h) : "—";
  const btcPos = (btc?.percentChange24h ?? 0) >= 0;
  const btcMcap = btc ? fmtUsd(btc.marketCap, { compact: true }) : "—";
  const btcVol = btc ? fmtUsd(btc.volume24h, { compact: true }) : "—";

  const btcTrendStr = btcPos ? "Bullish" : "Bearish";
  const ethTrendStr = (eth?.percentChange24h ?? 0) >= 0 ? "Bullish" : "Bearish";

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        {heroBanner}
        <aside className="panel p-5 space-y-5">
          <div className="flex items-center justify-between text-[11px] tracking-[0.2em] text-muted-foreground">
            <span>MARKET OVERVIEW</span>
            <span className="flex items-center gap-1">24H <ChevronDown className="h-3 w-3" /></span>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground">TOTAL MARKET CAP</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-semibold tracking-tight text-3xl">{totalMcap}</span>
              <span className={`text-xs ${totalMcapPos ? "text-success" : "text-destructive"}`}>{totalMcapChg}</span>
            </div>
            <DashboardChart height={64} points={mcapPoints || []} isUp={totalMcapPos} />
          </div>
          <div className="relative grid grid-cols-3 gap-3 border-t border-border pt-4">
            {[{ l: "BTC DOMINANCE", v: btcDom, c: g ? fmtPct(g.btcDominance - 50, 2) : "—", pos: true },{ l: "ETH DOMINANCE", v: g ? `${g.ethDominance.toFixed(2)}%` : "—", c: "", pos: true },{ l: "24H VOLUME", v: vol24, c: "", pos: true }].map((m) => (
              <div key={m.l}>
                <p className="text-[9px] tracking-wider text-muted-foreground">{m.l}</p>
                <p className="font-semibold tracking-tight mt-1 text-xl">{m.v}</p>
                {m.c && <p className="text-success text-[10px]">{m.c}</p>}
              </div>
            ))}
            {isFree && <LockOverlay onUpgrade={upgrade} />}
          </div>
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between text-[11px] tracking-[0.2em] text-muted-foreground">
              <span>TOP GAINERS</span>
              <Link href="/dashboard/market" className="text-[10px] hover:text-foreground">View All</Link>
            </div>
            <div className="mt-3 space-y-3">
              {gainers.map((c) => (
                <div key={c.symbol} className="flex items-center gap-3">
                  <CoinLogo id={c.id} symbol={c.symbol} size={28} />
                  <div className="flex-1 leading-tight">
                    <p className="text-sm font-medium">{c.symbol}</p>
                    <p className="text-[10px] text-muted-foreground">{c.name}</p>
                  </div>
                  <p className="text-sm">{fmtUsd(c.price)}</p>
                  <p className={`text-xs w-14 text-right ${c.percentChange24h >= 0 ? "text-success" : "text-destructive"}`}>{fmtPct(c.percentChange24h)}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>


      {/* Latest MARKET UPDATE — pinned */}
      {initialInsights[0] && (
        <section className="panel-elevated relative overflow-hidden p-6 sm:p-8 border border-foreground/20">
          <div className="absolute right-4 top-4 sm:right-6 sm:top-6 flex items-center justify-center h-8 w-8 rounded-full border border-border bg-secondary/40 text-[oklch(0.78_0.14_85)] shadow-sm">
            <Pin className="h-4 w-4 fill-current shrink-0" />
          </div>
          <p className="text-[11px] tracking-[0.3em] text-[oklch(0.78_0.14_85)]">
            MARKET UPDATE · {initialInsights[0].published_at ? new Date(initialInsights[0].published_at).toLocaleDateString() : "Just now"}
          </p>
          <h2 className="font-display mt-3 text-2xl sm:text-3xl max-w-3xl leading-tight pr-10 sm:pr-0">
            {initialInsights[0].title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{initialInsights[0].description}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={`/dashboard/insights/${initialInsights[0].slug}`} className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-4 py-2 text-xs font-medium">
              Read full insight <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <span className="text-[11px] text-muted-foreground">By The Hano Insiders · {initialInsights[0].body ? Math.ceil(initialInsights[0].body.split(/\s+/).length / 200) : 1} min read</span>
          </div>
        </section>
      )}

      {/* Today's Market Snapshot */}
      <section className="panel p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] tracking-[0.3em] text-muted-foreground">TODAY'S MARKET SNAPSHOT</p>
          <span className="text-[10px] text-muted-foreground">Live Data</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp, l: "BTC TREND", v: btcTrendStr, c: btcChg, pos: btcPos },
            { icon: TrendingDown, l: "ETH TREND", v: ethTrendStr, c: eth ? fmtPct(eth.percentChange24h) : "—", pos: (eth?.percentChange24h ?? 0) >= 0 },
            { icon: Activity, l: "FEAR & GREED", v: fngData ? `${fngData.value} · ${fngData.value_classification}` : "—", c: "Live", pos: Number(fngData?.value ?? 50) > 50 },
            { icon: TrendingUp, l: "TOP GAINER", v: topNarrative, c: topNarrativeChg, pos: true },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.l} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] tracking-wider text-muted-foreground">{s.l}</p>
                  <Icon className={`h-3.5 w-3.5 ${s.pos ? "text-success" : "text-muted-foreground"}`} />
                </div>
                <p className="font-semibold tracking-tight text-xl mt-2">{s.v}</p>
                <p className={`text-[10px] mt-0.5 ${s.pos ? "text-success" : "text-muted-foreground"}`}>{s.c}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <section className="panel p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#f7931a] flex items-center justify-center text-background font-bold">₿</div>
              <div>
                <p className="font-medium">BITCOIN / USD</p>
                <p className="text-[10px] tracking-wider text-muted-foreground">BTC</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-zinc-950/60 p-0.5 rounded-lg border border-border/40">
              {["1H", "24H", "7D", "30D", "1Y"].map((t) => (
                <button 
                  key={t} 
                  onClick={() => setBtcTimeframe(t)}
                  className={`px-2 sm:px-2.5 py-1 rounded transition ${
                    t === btcTimeframe 
                      ? "bg-accent text-foreground font-semibold" 
                      : "hover:text-foreground hover:bg-zinc-900/50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-3 flex-wrap">
            <span className="font-semibold tracking-tight text-3xl sm:text-4xl">{btcPrice}</span>
            <span className={`text-xs ${btcPos ? "text-success" : "text-destructive"}`}>{btcChg} (24H)</span>
          </div>
          <div className="mt-4 relative">
            <DashboardChart height={170} points={btcPoints || []} isUp={btcPos} />
            {isFree && <LockOverlay label="Advanced charts locked" onUpgrade={upgrade} />}
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border pt-4">
            {[{ l: "Market Cap", v: btcMcap },{ l: "24H Volume", v: btcVol },{ l: "1H Change", v: btc ? fmtPct(btc.percentChange1h) : "—" },{ l: "Dominance", v: btcDom }].map((s) => (
              <div key={s.l}>
                <p className="text-[10px] tracking-wider text-muted-foreground">{s.l}</p>
                <p className="font-semibold tracking-tight mt-1 text-lg">{s.v}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex items-center justify-between text-[11px] tracking-[0.2em] text-muted-foreground">
            <span>RECENT INSIGHTS</span>
            <Link href="/dashboard/insights" className="text-[10px] hover:text-foreground">View All</Link>
          </div>
          <div className="mt-4 space-y-4">
            {initialInsights.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 font-mono">No recent insights.</p>
            ) : (
              initialInsights.map((i) => {
                const locked = isFree && i.is_premium;
                return (
                  <Link href={`/dashboard/insights/${i.slug}`} key={i.id} className="relative flex gap-3 group cursor-pointer">
                    {i.thumbnail_url ? (
                      <img loading="lazy" decoding="async" src={i.thumbnail_url} alt="" className={`h-16 w-16 rounded-md object-cover border border-border shrink-0 ${locked ? "opacity-40" : ""}`} />
                    ) : (
                      <div className="h-16 w-16 bg-secondary/15 rounded-md border border-border flex items-center justify-center text-[10px] text-muted-foreground shrink-0">No Img</div>
                    )}
                    <div className={`flex-1 leading-snug min-w-0 ${locked ? "blur-sm select-none" : ""}`}>
                      <p className="text-sm font-medium group-hover:text-[oklch(0.78_0.14_85)] transition-colors truncate">{i.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{i.description}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{i.published_at ? new Date(i.published_at).toLocaleDateString() : ""}</p>
                    </div>
                    {locked && (
                      <div className="absolute inset-0 flex items-center justify-end pr-2">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </Link>
                );
              })
            )}
            {isFree && (
              <button onClick={upgrade} className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground hover:bg-secondary">
                Upgrade for full insights
              </button>
            )}
          </div>
        </section>
      </div>

      <section className="panel relative overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] md:grid-cols-[1fr_220px]">
          <div className="relative p-5 sm:p-8 md:p-10">
            <p className="font-display text-5xl text-muted-foreground/40 absolute left-3 sm:left-5 top-0 leading-none">"</p>
            <blockquote className="font-display text-lg sm:text-xl md:text-2xl italic leading-snug pl-5 sm:pl-8">
              {quote.text}
            </blockquote>
            <p className="mt-4 sm:mt-6 pl-5 sm:pl-8 text-xs sm:text-sm text-muted-foreground tracking-wider">
              — {quote.author}
            </p>
          </div>
          <div className="relative h-[160px] sm:h-auto sm:min-h-[180px] overflow-hidden border-t sm:border-t-0 sm:border-l border-border">
            <img
              src={quote.mascotSrc}
              alt={quote.author}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: quote.mascotObjectPosition }}
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-background/40" />
          </div>
        </div>
      </section>
    </>
  );
}
