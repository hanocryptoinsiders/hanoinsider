import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import { getContentItems } from "@/lib/content";
import { findCoinProfile, getCoinDescription } from "@/lib/coin-profiles";
import { getMarketSnapshot, type CmcCoin } from "@/lib/market.functions";
import { getCoinHistorySeriesPoints } from "@/lib/market-history";
import { CoinLogo } from "@/components/CoinLogo";
import { CoinPriceChart } from "@/components/dashboard/CoinPriceChart";
import { fmtPct, fmtUsd } from "@/lib/market-hooks";

function fmtSupply(n: number, symbol: string) {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)} ${symbol.toUpperCase()}`;
}

export default async function CoinDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const needle = decodeURIComponent(id).toLowerCase();

  const profile = findCoinProfile(needle);
  const snap = await getMarketSnapshot();

  // Resolve the coin from the live market snapshot (covers all top-100 assets).
  const marketCoin: CmcCoin | undefined =
    snap.top.find(
      (coin) =>
        coin.symbol.toLowerCase() === needle ||
        coin.name.toLowerCase() === needle ||
        String(coin.id) === needle ||
        (profile && (coin.symbol.toLowerCase() === profile.symbol.toLowerCase() || coin.id === profile.cmcId)),
    ) ?? undefined;

  // Only 404 when the coin is unknown to both the live market and curated profiles.
  if (!marketCoin && !profile) notFound();

  const name = marketCoin?.name ?? profile?.name ?? needle.toUpperCase();
  const symbol = (marketCoin?.symbol ?? profile?.symbol ?? needle).toUpperCase();
  const cmcId = marketCoin?.id ?? profile?.cmcId ?? 0;
  const change = marketCoin?.percentChange24h ?? 0;

  // SSR the default-timeframe real history so the chart paints immediately.
  const initialSeries = await getCoinHistorySeriesPoints(symbol, "7D").catch(() => []);

  const [insights, articles] = await Promise.all([
    getContentItems("insight").catch(() => []),
    getContentItems("article").catch(() => []),
  ]);

  const related = [...insights, ...articles]
    .filter((item) =>
      item.tags?.some(
        (tag) =>
          tag.toLowerCase() === symbol.toLowerCase() ||
          tag.toLowerCase() === name.toLowerCase() ||
          (profile && profile.tags.includes(tag.toLowerCase())),
      ),
    )
    .slice(0, 4);

  const stats: { label: string; value: string; accent?: "up" | "down" }[] = [
    { label: "Rank", value: marketCoin?.rank ? `#${marketCoin.rank}` : "—" },
    { label: "Market Cap", value: marketCoin ? fmtUsd(marketCoin.marketCap, { compact: true }) : "—" },
    { label: "24h Volume", value: marketCoin ? fmtUsd(marketCoin.volume24h, { compact: true }) : "—" },
    {
      label: "24h Change",
      value: marketCoin ? fmtPct(change) : "—",
      accent: change >= 0 ? "up" : "down",
    },
    { label: "Circulating Supply", value: marketCoin ? fmtSupply(marketCoin.circulatingSupply, symbol) : "—" },
    {
      label: "Max Supply",
      value: marketCoin?.maxSupply ? fmtSupply(marketCoin.maxSupply, symbol) : "Uncapped",
    },
  ];

  return (
    <div className="space-y-5">
      <Link href="/dashboard/market" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Market Overview
      </Link>

      <section className="panel-elevated p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <CoinLogo id={cmcId} symbol={symbol} size={54} />
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-violet-200">
                {marketCoin?.rank ? `Rank #${marketCoin.rank}` : "Coin Profile"}
              </p>
              <h1 className="mt-2 text-4xl font-semibold">{name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{symbol}</p>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 p-4 text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Current Price</p>
            <p className="mt-1 text-3xl font-semibold">{marketCoin ? fmtUsd(marketCoin.price) : "—"}</p>
            <p className={`mt-1 text-sm ${change >= 0 ? "text-success" : "text-destructive"}`}>
              {marketCoin ? fmtPct(change) : "—"} 24h
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{s.label}</p>
              <p
                className={`mt-1 text-sm font-semibold tabular-nums ${
                  s.accent === "up" ? "text-success" : s.accent === "down" ? "text-destructive" : ""
                }`}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <CoinPriceChart symbol={symbol} defaultTimeframe="7D" initialSeries={initialSeries} />
        </div>

        {snap.error ? (
          <p className="mt-3 text-xs text-amber-400/80">
            Live market data is temporarily unavailable; showing the latest cached context.
          </p>
        ) : null}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="panel p-6 lg:col-span-2">
          <BookOpen className="h-5 w-5 text-violet-300" />
          <h2 className="mt-4 text-xl font-semibold">What it is</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {getCoinDescription(name, symbol, profile)}
          </p>
        </div>

        {profile ? (
          <>
            <div className="panel p-6">
              <TrendingUp className="h-5 w-5 text-violet-300" />
              <h2 className="mt-4 text-xl font-semibold">Main advantages</h2>
              <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                {profile.advantages.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div className="panel p-6">
              <ShieldAlert className="h-5 w-5 text-violet-300" />
              <h2 className="mt-4 text-xl font-semibold">Main risks and disadvantages</h2>
              <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                {profile.risks.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </section>

      <section className="panel p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-300" />
          <h2 className="text-xl font-semibold">Related Hano analysis</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {related.map((item) => (
            <Link key={item.id} href={`/dashboard/${item.content_type}s/${item.slug}`} className="rounded-lg border border-white/10 bg-black/20 p-4 hover:bg-white/[0.04]">
              <p className="text-[10px] uppercase tracking-[0.2em] text-violet-200">{item.content_type}</p>
              <h3 className="mt-2 font-semibold">{item.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
            </Link>
          ))}
          {!related.length && <p className="text-sm text-muted-foreground">No related Hano articles are tagged yet.</p>}
        </div>
      </section>

      <p className="rounded-lg border border-white/10 bg-black/20 p-4 text-xs leading-relaxed text-muted-foreground">
        Hano Insiders provides educational content and market analysis only. Nothing on this platform is financial advice.
      </p>
    </div>
  );
}
