import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import { getContentItems } from "@/lib/content";
import { findCoinProfile } from "@/lib/coin-profiles";
import { getMarketSnapshot } from "@/lib/market.functions";
import { CoinLogo } from "@/components/CoinLogo";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { fmtPct, fmtUsd } from "@/lib/market-hooks";

export default async function CoinDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = findCoinProfile(id);
  if (!profile) notFound();

  const [snap, insights, articles] = await Promise.all([
    getMarketSnapshot(),
    getContentItems("insight").catch(() => []),
    getContentItems("article").catch(() => []),
  ]);

  const marketCoin = snap.top.find((coin) => coin.symbol.toLowerCase() === profile.symbol.toLowerCase() || coin.id === profile.cmcId);
  const related = [...insights, ...articles]
    .filter((item) => item.tags?.some((tag) => profile.tags.includes(tag.toLowerCase()) || tag.toLowerCase() === profile.symbol.toLowerCase()))
    .slice(0, 4);

  const change = marketCoin?.percentChange24h ?? 0;

  return (
    <div className="space-y-5">
      <Link href="/dashboard/market" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Market Overview
      </Link>

      <section className="panel-elevated p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <CoinLogo id={profile.cmcId} symbol={profile.symbol} size={54} />
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-violet-200">Coin Profile</p>
              <h1 className="mt-2 text-4xl font-semibold">{profile.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{profile.symbol}</p>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 p-4 text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Current Price</p>
            <p className="mt-1 text-3xl font-semibold">{marketCoin ? fmtUsd(marketCoin.price) : "-"}</p>
            <p className={`mt-1 text-sm ${change >= 0 ? "text-success" : "text-destructive"}`}>{marketCoin ? fmtPct(change) : "-"} 24h</p>
          </div>
        </div>
        <div className="mt-8 rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Price Chart</p>
          <Sparkline height={120} points={[42, 45, 43, 48, 51, 50, 55, 53, 58, 61, 59, 64]} className="mt-4" />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="panel p-6">
          <BookOpen className="h-5 w-5 text-violet-300" />
          <h2 className="mt-4 text-xl font-semibold">What it is</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{profile.summary}</p>
        </div>
        <div className="panel p-6">
          <TrendingUp className="h-5 w-5 text-violet-300" />
          <h2 className="mt-4 text-xl font-semibold">Main advantages</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            {profile.advantages.map((item) => <li key={item}>- {item}</li>)}
          </ul>
        </div>
        <div className="panel p-6 lg:col-span-2">
          <ShieldAlert className="h-5 w-5 text-violet-300" />
          <h2 className="mt-4 text-xl font-semibold">Main risks and disadvantages</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            {profile.risks.map((item) => <li key={item}>- {item}</li>)}
          </ul>
        </div>
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