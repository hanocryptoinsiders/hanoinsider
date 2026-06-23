"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { LockOverlay } from "@/components/dashboard/LockOverlay";
import { useTier } from "@/lib/tier-context";
import { useFreeAccess } from "@/lib/free-access-context";
import { getMarketSnapshot, type CmcCoin, type MarketSnapshot } from "@/lib/market.functions";
import { CoinLogo } from "@/components/CoinLogo";
import { useMarketSnapshot } from "@/lib/market-hooks";

const fmtUsd = (n: number) => {
  if (!Number.isFinite(n) || n === 0) return "â€”";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${n.toPrecision(3)}`;
};
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

function generateDeterministicPoints(changePct: number, seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  const random = () => {
    const x = Math.sin(h++) * 10000;
    return x - Math.floor(x);
  };

  const points = [];
  const length = 12;
  const start = 50;
  points.push(start);
  
  const stepChange = changePct / (length - 1);
  let current = start;
  
  for (let i = 1; i < length; i++) {
    const volatility = 4;
    const change = stepChange * 6 + (random() - 0.5) * volatility;
    current += change;
    points.push(current);
  }
  return points;
}

export function MarketClient({ initialSnap }: { initialSnap: MarketSnapshot }) {
  const { isFree, upgrade } = useTier();
  const fa = useFreeAccess();
  const showLock = isFree && !fa.state.marketPreview;

  const { data: snap, isLoading, isFetching, refetch, error } = useMarketSnapshot(initialSnap);

  const g = snap?.global;
  const coins: CmcCoin[] = snap?.top ?? [];
  const gainers = [...coins].sort((a, b) => b.percentChange24h - a.percentChange24h).slice(0, 5);
  const losers = [...coins].sort((a, b) => a.percentChange24h - b.percentChange24h).slice(0, 5);

  const stats = g
    ? [
        { l: "GLOBAL MARKET CAP", v: fmtUsd(g.totalMarketCap), c: fmtPct(g.marketCapChange24h), up: g.marketCapChange24h >= 0, points: generateDeterministicPoints(g.marketCapChange24h, "mcap") },
        { l: "BTC DOMINANCE", v: `${g.btcDominance.toFixed(2)}%`, c: "Bitcoin share", up: true, points: generateDeterministicPoints(0.8, "btcdom") },
        { l: "ETH DOMINANCE", v: `${g.ethDominance.toFixed(2)}%`, c: "Ethereum share", up: true, points: generateDeterministicPoints(0.3, "ethdom") },
        { l: "24H VOLUME", v: fmtUsd(g.totalVolume24h), c: "Across all assets", up: true, points: generateDeterministicPoints(1.5, "vol") },
        { l: "FEAR & GREED", v: "Neutral", c: "Sentiment context", up: true, points: generateDeterministicPoints(0.05, "fng") },
        { l: "RSI CONTEXT", v: "52", c: "Balanced momentum", up: true, points: generateDeterministicPoints(0.05, "rsi") },
        { l: "TOP ASSET", v: coins[0]?.symbol ?? "â€”", c: coins[0] ? fmtUsd(coins[0].price) : "", up: (coins[0]?.percentChange24h ?? 0) >= 0, points: generateDeterministicPoints(coins[0]?.percentChange24h ?? 0, "topasset") },
      ]
    : [];

  return (
    <>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-[11px] tracking-[0.2em] text-muted-foreground">
          {snap?.error
            ? <span className="text-destructive">ERROR Â· {snap.error}</span>
            : snap?.fetchedAt
              ? `LIVE Â· UPDATED ${new Date(snap.fetchedAt).toLocaleTimeString()}`
              : "LOADINGâ€¦"}
        </p>
        <button
          onClick={() => refetch()}
          className="panel inline-flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition"
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="relative grid grid-cols-2 lg:grid-cols-3 gap-5">
        {(!snap && isLoading ? Array.from({ length: 6 }).map((_, i) => ({ l: "LOADING", v: "â€”", c: "", up: true, key: i, points: [] })) : stats).map((s: any, i: number) => (
          <div key={s.l + i} className="panel p-6">
            <p className="text-[10px] tracking-wider text-muted-foreground">{s.l}</p>
            <p className="font-semibold tracking-tight mt-2 text-3xl">{s.v}</p>
            <p className={`text-xs mt-1 ${s.up ? "text-success" : "text-destructive"}`}>{s.c}</p>
            <Sparkline height={36} points={s.points} className="mt-3" />
          </div>
        ))}
        {showLock && <LockOverlay label="Premium analytics locked" onUpgrade={upgrade} />}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {[{ title: "TOP GAINERS (24H)", data: gainers, neg: false }, { title: "TOP LOSERS (24H)", data: losers, neg: true }].map((sec) => (
          <section key={sec.title} className="panel p-6">
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground">{sec.title}</p>
            <div className="mt-4 space-y-3">
              {sec.data.length === 0 && (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  {isLoading && !snap ? "Loadingâ€¦" : "No data."}
                </p>
              )}
              {sec.data.map((g) => {
                const up = g.percentChange24h >= 0;
                return (
                  <div key={g.symbol} className="flex items-center gap-3 border-b border-border last:border-0 pb-3 last:pb-0">
                    <CoinLogo id={g.id} symbol={g.symbol} size={32} className="shrink-0" />
                    <div className="flex-1 leading-tight min-w-0">
                      <p className="text-sm font-medium truncate">{g.symbol}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{g.name}</p>
                    </div>
                    <p className="text-sm tabular-nums">{fmtUsd(g.price)}</p>
                    <p className={`text-xs w-20 text-right tabular-nums ${up ? "text-success" : "text-destructive"}`}>
                      {fmtPct(g.percentChange24h)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="panel p-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground">TOP 100 BY MARKET CAP · LIVE</p>
          <span className="text-[10px] text-muted-foreground">Source: CoinMarketCap</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-[10px] tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left font-normal py-2 w-8">#</th>
                <th className="text-left font-normal py-2">ASSET</th>
                <th className="text-right font-normal py-2">PRICE</th>
                <th className="text-right font-normal py-2">1H</th>
                <th className="text-right font-normal py-2">24H</th>
                <th className="text-right font-normal py-2">7D</th>
                <th className="text-right font-normal py-2">MCAP</th>
              </tr>
            </thead>
            <tbody>
              {coins.map((c, i) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="py-3">
                    <Link href={`/dashboard/coins/${c.symbol.toLowerCase()}`} className="flex items-center gap-2 hover:text-violet-200">
                      <CoinLogo id={c.id} symbol={c.symbol} size={22} />
                      <span className="font-medium">{c.symbol}</span>
                      <span className="text-xs text-muted-foreground truncate">{c.name}</span>
                    </Link>
                  </td>
                  <td className="py-3 text-right tabular-nums">{fmtUsd(c.price)}</td>
                  <td className={`py-3 text-right tabular-nums ${c.percentChange1h >= 0 ? "text-success" : "text-destructive"}`}>{fmtPct(c.percentChange1h)}</td>
                  <td className={`py-3 text-right tabular-nums ${c.percentChange24h >= 0 ? "text-success" : "text-destructive"}`}>{fmtPct(c.percentChange24h)}</td>
                  <td className={`py-3 text-right tabular-nums ${c.percentChange7d >= 0 ? "text-success" : "text-destructive"}`}>{fmtPct(c.percentChange7d)}</td>
                  <td className="py-3 text-right tabular-nums">{fmtUsd(c.marketCap)}</td>
                </tr>
              ))}
              {coins.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="text-xs text-muted-foreground py-8 text-center">
                    {error ? "Failed to load market data." : "No coins available."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
