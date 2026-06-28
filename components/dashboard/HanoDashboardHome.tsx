"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { CoinLogo } from "@/components/CoinLogo";
import type { CmcCoin, MarketSnapshot } from "@/lib/market.functions";
import { fmtPct, fmtUsd, useCoinHistory, useHomeMarketSnapshot } from "@/lib/market-hooks";

const articleCover = "/assets/hanoinfrontend/cardBg.png";

const RANGES = ["24H", "7D", "1M", "1Y"] as const;
type Range = (typeof RANGES)[number];

const RANGE_TO_HISTORY: Record<Range, string> = {
  "24H": "24H",
  "7D": "7D",
  "1M": "30D",
  "1Y": "1Y",
};

const HOME_SYMBOLS = ["BTC", "ETH", "SOL", "BNB"] as const;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDeskDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function formatUpdatedAt(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function pickHomeCoins(top: CmcCoin[]): CmcCoin[] {
  return HOME_SYMBOLS.map((sym) => top.find((c) => c.symbol === sym)).filter(
    (c): c is CmcCoin => Boolean(c)
  );
}

export function HanoDashboardHome({ initialSnap }: { initialSnap: MarketSnapshot }) {
  const { profile, user } = useAuth();
  const { data: snap } = useHomeMarketSnapshot(initialSnap);
  const name = profile?.full_name || user?.email?.split("@")[0] || "Insider";
  const market = snap ?? initialSnap;

  return (
    <div className="dash-home-stack">
      <section className="dash-welcome">
        <div>
          <p className="dash-card-kicker">
            <span className="pulse-dot" />
            <span>The desk</span>
            <span className="bar" />
            <span className="acc">Today</span>
          </p>
          <h2>
            {getGreeting()}, <em>{name}.</em>
          </h2>
        </div>
        <p className="dash-welcome-note">
          {formatDeskDate()}
          <br />
          Market · {market.error ? "demo data" : `updated ${formatUpdatedAt(market.fetchedAt)}`}
        </p>
      </section>

      <DeskMetrics snap={market} />
      <MarketOverview snap={market} />

      <div className="dash-home-grid">
        <div className="dash-home-main">
          <div className="dash-home-split">
            <InsightsPanel />
            <ArticlesPanel />
          </div>
          <TrustBar />
        </div>

        <aside className="dash-home-rail">
          <MascotCard />
          <AffiliatePanel />
        </aside>
      </div>
    </div>
  );
}

function DeskMetrics({ snap }: { snap: MarketSnapshot }) {
  const g = snap.global;
  const mcapChg = g?.marketCapChange24h ?? 0;
  const chgPositive = mcapChg >= 0;
  const assets = g?.activeCryptocurrencies ?? snap.top.length;
  const isLive = !snap.error;

  return (
    <section className="dash-metrics">
      <div className="cell dash-metric-cell">
        <div className="dash-stat-lbl">Market cap</div>
        <div className="dash-stat-val">
          {g ? fmtUsd(g.totalMarketCap, { compact: true }) : "—"}
        </div>
      </div>
      <div className="cell dash-metric-cell">
        <div className="dash-stat-lbl">24h change</div>
        <div
          className="dash-stat-val"
          style={{ color: chgPositive ? "var(--win)" : "var(--loss, #f87171)" }}
        >
          {g ? fmtPct(mcapChg) : "—"}
        </div>
      </div>
      <div className="cell dash-metric-cell">
        <div className="dash-stat-lbl">Assets tracked</div>
        <div className="dash-stat-val">{assets > 0 ? `${assets}+` : "—"}</div>
      </div>
      <div className="cell dash-metric-cell">
        <div className="dash-stat-lbl">Desk status</div>
        <div className="dash-stat-val" style={{ color: "var(--accent-soft)", fontSize: 20 }}>
          {isLive ? "Live" : "Demo"}
        </div>
      </div>
    </section>
  );
}

function MarketOverview({ snap }: { snap: MarketSnapshot }) {
  const [range, setRange] = useState<Range>("1Y");
  const historyTf = RANGE_TO_HISTORY[range];
  const { data: historyPts, isLoading: historyLoading } = useCoinHistory("BTC", historyTf);

  const g = snap.global;
  const mcapChg = g?.marketCapChange24h ?? 0;
  const chgPositive = mcapChg >= 0;
  const coins = useMemo(() => pickHomeCoins(snap.top), [snap.top]);
  const sparkPts = historyPts && historyPts.length >= 2 ? historyPts : null;
  const isLive = !snap.error;

  return (
    <section className="dash-card dash-card--hero">
      <div className="dash-card-head dash-market-head">
        <div>
          <p className="dash-card-kicker">
            <span className={isLive ? "acc" : ""}>{isLive ? "Live" : "Demo"}</span>
            <span className="bar" />
            <span className="dash-market-kicker-label">Market overview</span>
            {snap.fetchedAt ? (
              <>
                <span className="bar hidden sm:inline" />
                <span className="hidden sm:inline">{formatUpdatedAt(snap.fetchedAt)}</span>
              </>
            ) : null}
          </p>
          <h2 className="dash-card-title dash-card-title--lg">Total market snapshot</h2>
        </div>
        <div className="dash-market-range-wrap flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          <div className="dash-range-toggle">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`dash-range-btn ${r === range ? "dash-range-btn--active" : ""}`}
              >
                {r}
              </button>
            ))}
          </div>
          <Link href="/dashboard/market" className="dash-link hidden sm:inline-flex">
            Full desk<span className="arr">→</span>
          </Link>
        </div>
      </div>

      <div className="dash-market-body">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="dash-stat-val" style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>
              {g ? fmtUsd(g.totalMarketCap, { compact: true }) : "—"}
            </span>
            {g ? (
              <span
                className="font-mono text-xs font-semibold"
                style={{ color: chgPositive ? "var(--win)" : "var(--loss, #f87171)" }}
              >
                {fmtPct(mcapChg)}
              </span>
            ) : null}
          </div>
          <p className="dash-stat-lbl">Aggregate market capitalization · BTC trend ({range})</p>
          {sparkPts ? (
            <Sparkline pts={sparkPts} />
          ) : (
            <div
              className="mt-6 flex h-24 w-full items-center justify-center border border-[var(--border)] bg-[var(--surface)]/40 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-3)]"
              aria-hidden={historyLoading}
            >
              {historyLoading ? "Loading chart…" : "Chart unavailable"}
            </div>
          )}
        </div>

        <div className="dash-coin-grid">
          {coins.map((c) => {
            const up = c.percentChange24h >= 0;
            return (
              <Link
                key={c.symbol}
                href={`/dashboard/coins/${c.symbol.toLowerCase()}`}
                className="dash-coin-row"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CoinLogo id={c.id} symbol={c.symbol} size={20} />
                    <span className="font-mono text-xs font-semibold tracking-wide">{c.symbol}</span>
                  </div>
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: up ? "var(--win)" : "var(--loss, #f87171)" }}
                  >
                    {fmtPct(c.percentChange24h)}
                  </span>
                </div>
                <div className="mt-2 font-mono text-sm font-semibold tabular-nums">
                  {fmtUsd(c.price)}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Sparkline({ pts }: { pts: number[] }) {
  const w = 400;
  const h = 100;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const d = pts
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${(i / (pts.length - 1)) * w} ${h - ((p - min) / (max - min || 1)) * h}`
    )
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-6 h-24 w-full" aria-hidden>
      <defs>
        <linearGradient id="dashboardSparkline" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#9b82dc" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#9b82dc" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((y) => (
        <line
          key={y}
          x1={0}
          y1={h * y}
          x2={w}
          y2={h * y}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={1}
        />
      ))}
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill="url(#dashboardSparkline)" />
      <path d={d} fill="none" stroke="#9b82dc" strokeWidth="1.5" />
    </svg>
  );
}

function InsightsPanel() {
  const items = [
    { t: "Bitcoin Macro Trend Shift?", time: "2h ago", tag: "BTC", href: "/dashboard/insights" },
    { t: "Why Altcoins Are Quiet Before The Next Move", time: "5h ago", tag: "ALT", href: "/dashboard/insights" },
    { t: "This On-Chain Signal Has Nailed Every Bottom", time: "1d ago", tag: "ON-CHAIN", href: "/dashboard/insights" },
  ];

  return (
    <div className="dash-card">
      <div className="dash-card-head" style={{ marginBottom: 16, paddingBottom: 16 }}>
        <div>
          <p className="dash-card-kicker">
            <span className="acc">Briefs</span>
          </p>
          <h2 className="dash-card-title">Latest insights</h2>
        </div>
        <Link href="/dashboard/insights" className="dash-link">
          View all<span className="arr">→</span>
        </Link>
      </div>
      <div className="dash-card-body dash-insight-list">
        {items.map((i, idx) => (
          <Link key={i.t} href={i.href} className="dash-insight-row group">
            <span className="dash-insight-num">{String(idx + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <div className="text-sm font-medium leading-snug text-[var(--fg)] group-hover:text-white">
                {i.t}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
                {i.time}
              </div>
            </div>
            <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-[var(--accent-soft)]">
              {i.tag}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ArticlesPanel() {
  return (
    <div className="dash-card">
      <div className="dash-card-head" style={{ marginBottom: 16, paddingBottom: 16 }}>
        <div>
          <p className="dash-card-kicker">
            <span className="acc">Research</span>
          </p>
          <h2 className="dash-card-title">Featured article</h2>
        </div>
        <Link href="/dashboard/articles" className="dash-link">
          View all<span className="arr">→</span>
        </Link>
      </div>
      <div className="dash-card-body">
        <Image
          src={articleCover}
          alt=""
          width={800}
          height={512}
          className="aspect-[16/10] w-full border border-[var(--border)] object-cover"
        />
        <h3 className="mt-4 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[var(--fg)]">
          The Institutions Are Coming to Crypto
        </h3>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-[var(--fg-2)]">
          How traditional finance is entering the space — and what it means for serious beginners.
        </p>
        <div className="mt-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
          <span>May 4, 2025</span>
          <span>·</span>
          <span>8 min read</span>
        </div>
      </div>
    </div>
  );
}

function AffiliatePanel() {
  return (
    <div className="dash-card">
      <p className="dash-card-kicker">
        <span className="acc">Referrals</span>
      </p>
      <h2 className="dash-card-title">Affiliate program</h2>
      <p className="mt-2 font-serif text-sm italic text-[var(--fg-2)]">
        Earn on every member you bring to the desk.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-px border border-[var(--border)] bg-[var(--border)]">
        <div className="bg-[var(--bg-2)] p-4">
          <div className="dash-stat-val text-[var(--accent-soft)]" style={{ fontSize: 22 }}>30%</div>
          <div className="dash-stat-lbl">Commission</div>
        </div>
        <div className="bg-[var(--bg-2)] p-4">
          <div className="dash-stat-val" style={{ fontSize: 22 }}>$1,250</div>
          <div className="dash-stat-lbl">Earned</div>
        </div>
      </div>
      <Link href="/dashboard/affiliate" className="dash-btn-secondary mt-5">
        Open affiliate desk
      </Link>
    </div>
  );
}

function MascotCard() {
  return (
    <div className="dash-card text-center">
      <p className="dash-card-kicker text-left">
        <span>Desk note</span>
      </p>
      <Image
        src="/assets/hanoinfrontend/mascot1.png"
        alt="Hano mascot"
        width={256}
        height={256}
        className="mx-auto mt-5 h-24 w-24 border border-[var(--border)] object-cover"
      />
      <p className="dash-rail-quote mt-5 text-left" style={{ border: 0, padding: 0 }}>
        &ldquo;Stay early. Stay sharp. Stay HANO.&rdquo;
      </p>
    </div>
  );
}

function TrustBar() {
  return (
    <section className="dash-trust-wrap" aria-label="Platform trust metrics">
      <p className="dash-trust-kicker">
        <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
        <span>Secure · Private · Built for Insiders</span>
      </p>
      <div className="dash-metrics dash-metrics--3">
        <div className="cell dash-metric-cell">
          <div className="dash-stat-val" style={{ fontSize: 22 }}>1,250+</div>
          <div className="dash-stat-lbl">Members</div>
        </div>
        <div className="cell dash-metric-cell">
          <div className="dash-stat-val" style={{ fontSize: 22 }}>98%</div>
          <div className="dash-stat-lbl">Satisfaction</div>
        </div>
        <div className="cell dash-metric-cell">
          <div className="dash-stat-val" style={{ fontSize: 22 }}>24/7</div>
          <div className="dash-stat-lbl">Support</div>
        </div>
      </div>
    </section>
  );
}
