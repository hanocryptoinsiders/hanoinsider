"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  TrendingUp,
  Zap,
  FileText,
  UserPlus,
  Lock,
  Mail,
} from "lucide-react";

const heroMascot = "/assets/hanoinfrontend/hero-mascot.jpg";
const articleCover = "/assets/hanoinfrontend/article-cover.jpg";

const RANGES = ["24H", "7D", "1M", "1Y"] as const;
type Range = (typeof RANGES)[number];

const RANGE_DATA: Record<Range, number[]> = {
  "24H": [40, 38, 42, 45, 44, 48, 47, 52, 50, 55, 58, 60],
  "7D": [30, 35, 32, 40, 38, 45, 43, 50, 48, 55, 52, 60, 58, 64],
  "1M": [20, 25, 22, 30, 28, 36, 33, 42, 40, 48, 46, 54, 52, 60, 58, 64],
  "1Y": [10, 18, 14, 22, 20, 28, 26, 34, 32, 40, 38, 48, 46, 56, 54, 64],
};

export function HanoDashboardHome() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <MarketOverview />
            <InsightsPanel />
            <ArticlesPanel />
          </div>
          <SecureBanner />
        </div>
        <aside className="space-y-5">
          <MascotCard />
          <AffiliatePanel />
        </aside>
      </div>
    </div>
  );
}

function PanelHead({
  icon,
  title,
  action,
}: {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </div>
      {action}
    </div>
  );
}

function MarketOverview() {
  const [range, setRange] = useState<Range>("1Y");
  const pts = RANGE_DATA[range];
  const coins = [
    { s: "BTC", p: "$67,892.21", c: "1.23%", color: "#f7931a", l: "B" },
    { s: "ETH", p: "$3,456.78", c: "2.01%", color: "#627eea", l: "E" },
    { s: "SOL", p: "$155.32", c: "3.65%", color: "#14f195", l: "S" },
    { s: "BNB", p: "$598.11", c: "1.18%", color: "#f3ba2f", l: "B" },
  ];

  return (
    <div className="card-surface p-5">
      <PanelHead
        icon={<TrendingUp className="h-4 w-4 text-primary" />}
        title="Market Overview"
        action={
          <span className="flex items-center gap-1.5 text-xs text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Live
          </span>
        }
      />
      <div className="mt-4 flex items-baseline gap-3">
        <span className="font-display text-3xl font-extrabold">$2.49T</span>
        <span className="text-xs text-success">+2.35%</span>
      </div>
      <div className="text-xs text-muted-foreground">Total Market Cap</div>

      <div className="mt-3 flex gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${r === range ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary/60"}`}
          >
            {r}
          </button>
        ))}
      </div>

      <Sparkline pts={pts} />

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {coins.map((c) => (
          <Link key={c.s} href={`/dashboard/coins/${c.s.toLowerCase()}`} className="rounded-lg border border-border bg-background/40 p-2.5 transition-colors hover:border-primary/40">
            <div className="flex items-center gap-1.5">
              <div className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] text-white" style={{ background: c.color }}>
                {c.l}
              </div>
              <span className="font-semibold">{c.s}</span>
            </div>
            <div className="mt-1 font-semibold">{c.p}</div>
            <div className="text-[10px] text-success">+{c.c}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Sparkline({ pts }: { pts: number[] }) {
  const w = 320;
  const h = 90;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i / (pts.length - 1)) * w} ${h - ((p - min) / (max - min || 1)) * h}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-24 w-full">
      <defs>
        <linearGradient id="dashboardSparkline" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.72 0.26 305)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="oklch(0.72 0.26 305)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill="url(#dashboardSparkline)" />
      <path d={d} fill="none" stroke="oklch(0.72 0.26 305)" strokeWidth="2" />
    </svg>
  );
}

function InsightsPanel() {
  const items = [
    { t: "Bitcoin Macro Trend Shift?", time: "2h ago", tag: "BTC", color: "#f7931a", l: "B", href: "/dashboard/insights" },
    { t: "Why Altcoins Are Quiet Before The Next Move", time: "5h ago", tag: "ALT", color: "#627eea", l: "A", href: "/dashboard/insights" },
    { t: "This On-Chain Signal Has Nailed Every Bottom", time: "1d ago", tag: "ON-CHAIN", color: "#14f195", l: "O", href: "/dashboard/insights" },
  ];

  return (
    <div className="card-surface p-5">
      <PanelHead
        icon={<Zap className="h-4 w-4 text-primary" />}
        title="Insights"
        action={<Link href="/dashboard/insights" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>}
      />
      <div className="mt-4 space-y-3">
        {items.map((i) => (
          <Link key={i.t} href={i.href} className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3 transition-colors hover:border-primary/40">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs text-white" style={{ background: i.color }}>
              {i.l}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold leading-snug">{i.t}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">{i.time}</div>
            </div>
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-primary">{i.tag}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ArticlesPanel() {
  return (
    <div className="card-surface p-5">
      <PanelHead
        icon={<FileText className="h-4 w-4 text-primary" />}
        title="Articles"
        action={<Link href="/dashboard/articles" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>}
      />
      <Image src={articleCover} alt="" width={800} height={512} className="mt-4 aspect-video w-full rounded-lg object-cover" />
      <div className="mt-3 text-sm font-semibold">The Institutions Are Coming to Crypto</div>
      <div className="mt-1 text-xs text-muted-foreground">A deep dive into how traditional finance is entering the space and what it means for retail investors.</div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>May 4, 2025</span>
        <span>|</span>
        <span>8 min read</span>
      </div>
    </div>
  );
}


function AffiliatePanel() {
  return (
    <div className="card-surface p-5">
      <PanelHead icon={<UserPlus className="h-4 w-4 text-primary" />} title="Affiliate Program" />
      <div className="mt-2 text-xs text-muted-foreground">Earn lifetime commissions</div>
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <div className="font-display text-4xl font-extrabold text-primary">30%</div>
          <div className="mt-1 text-xs text-muted-foreground">Commission Rate</div>
        </div>
        <div>
          <div className="font-display text-4xl font-extrabold">$1,250</div>
          <div className="mt-1 text-xs text-muted-foreground">Total Earned</div>
        </div>
      </div>
      <Link href="/dashboard/affiliate" className="mt-6 block w-full rounded-xl border border-border bg-secondary/50 py-3 text-center text-sm font-semibold transition-colors hover:bg-secondary">
        View Affiliate Dashboard
      </Link>
    </div>
  );
}

function MascotCard() {
  return (
    <div className="card-surface p-5 text-center">
      <div className="text-left font-semibold">Insiders Mascot</div>
      <Image src={heroMascot} alt="Hano mascot" width={1024} height={1024} className="mx-auto mt-3 h-48 w-48 rounded-3xl object-cover" />
      <p className="mt-3 text-sm text-muted-foreground">"Stay early. Stay sharp. Stay HANO."</p>
    </div>
  );
}


function SecureBanner() {
  return (
    <div className="card-surface flex flex-wrap items-center justify-between gap-6 p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold">Secure. Private. Built for Insiders.</div>
          <div className="text-xs text-muted-foreground">Your edge in crypto starts here.</div>
        </div>
      </div>
      <div className="flex gap-8">
        <Stat v="1,250+" l="Members" />
        <Stat v="98%" l="Satisfaction" />
        <Stat v="24/7" l="Support" />
      </div>
    </div>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-xl font-extrabold">{v}</div>
      <div className="text-[10px] text-muted-foreground">{l}</div>
    </div>
  );
}
