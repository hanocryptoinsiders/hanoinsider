"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  Sparkles,
  Box,
  BarChart3,
  ArrowRight,
  Play,
  Star,
  Check,
  Zap,
  FileText,
  UserPlus,
  Headphones,
  Settings,
  LayoutDashboard,
  TrendingUp,
  Plus,
  Loader2,
  CreditCard,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { HanoWordmark } from "@/components/brand/HanoWordmark";

const heroMascot = "/assets/hanoinfrontend/hero-mascot.jpg";
const birdMascot = "/assets/hanoinfrontend/bird-mascot.jpg";
const articleCover = "/assets/hanoinfrontend/article-cover.jpg";

export function HanoLanding() {
  const { user, grantPremium, isPremium } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Poll for payment success confirmation
  useEffect(() => {
    const isSuccess = searchParams.get("checkout") === "success" || searchParams.get("session_id");
    const hasCheckoutKey = typeof window !== "undefined" && localStorage.getItem("hano_checkout");

    if (isSuccess || hasCheckoutKey) {
      setIsVerifying(true);
      let attempts = 0;
      const poll = setInterval(async () => {
        try {
          const res = await fetch("/api/stripe/check-status");
          const data = await res.json();
          attempts++;

          if (data.isPremium) {
            clearInterval(poll);
            if (typeof window !== "undefined") {
              localStorage.removeItem("hano_checkout");
            }
            grantPremium();
            toast.success("Payment verified! Welcome to Hano Insiders.");
            setIsVerifying(false);
            router.push("/dashboard");
          } else if (attempts >= 15) {
            clearInterval(poll);
            setIsVerifying(false);
            toast.error("Payment verification is taking longer than expected. Please refresh this page.");
          }
        } catch (err) {
          console.error("Verification poll error:", err);
        }
      }, 2000);

      return () => clearInterval(poll);
    }
  }, [searchParams, grantPremium, router]);

  // Auto-scroll to pricing if renew=1
  useEffect(() => {
    if (searchParams.get("renew") === "1") {
      // Short delay to ensure DOM is painted
      const timer = setTimeout(() => {
        const pricingSection = document.getElementById("pricing");
        if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleCheckout = async (plan: string, offer?: string) => {
    if (!user) {
      router.push(`/register?next=${encodeURIComponent("/?renew=1")}`);
      return;
    }

    setIsLoading(true);
    setActivePlan(offer === "early_bird" ? "early_bird" : "monthly");

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, offer }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Failed to create checkout session");

      if (typeof window !== "undefined") {
        localStorage.setItem("hano_checkout", JSON.stringify({ provider: "stripe", timestamp: Date.now() }));
      }
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      if (typeof window !== "undefined") {
        localStorage.removeItem("hano_checkout");
      }
      setIsLoading(false);
      setActivePlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground bg-noise relative">
      {/* Verify Overlay */}
      {isVerifying && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h2 className="mt-4 font-display text-2xl font-bold">Verifying your payment...</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">We are confirming your premium credentials with Stripe. This takes just a moment.</p>
        </div>
      )}

      <Nav />

      {/* Warning Banner */}
      {user && !isPremium && (
        <div className="mx-auto max-w-7xl px-6 mt-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-center text-sm text-primary font-medium flex items-center justify-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
            <span>Active subscription required to access the dashboard. Please select a pricing plan below to subscribe.</span>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 pb-24">
        <Hero />
        <Pricing handleCheckout={handleCheckout} isLoading={isLoading} activePlan={activePlan} userEmail={user?.email || null} />
        <Features />
        <About />
        <DashboardPreview />
        <Faqs />
        <CTA />
      </main>
      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Copyright 2026 Hano Insiders. Educational content and market analysis only.
      </footer>
    </div>
  );
}

function Nav() {
  const { user, profile, isPremium } = useAuth();
  const router = useRouter();
  
  const links = [
    { label: "Home", href: "#home" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "About", href: "#about" },
    { label: "FAQs", href: "#faqs" },
  ];

  const handleEnterDashboard = () => {
    if (isPremium) {
      router.push("/dashboard");
    } else {
      const pricingSection = document.getElementById("pricing");
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: "smooth" });
      } else {
        router.push("/?renew=1#pricing");
      }
    }
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Hano Insider";
  const avatarUrl = profile?.avatar_url || "/assets/hanoinfrontend/hero-mascot.jpg";

  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <HanoWordmark />
      <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
        {links.map((link, index) => (
          <a
            key={link.label}
            href={link.href}
            className={`relative transition-colors hover:text-foreground ${index === 0 ? "text-foreground" : ""}`}
          >
            {link.label}
            {index === 0 && (
              <span className="absolute -bottom-1.5 left-1/2 h-0.5 w-4 -translate-x-1/2 bg-primary" />
            )}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleEnterDashboard}
              className="rounded-lg border border-border bg-secondary/40 px-5 py-2 text-sm font-medium transition-colors hover:bg-secondary cursor-pointer"
            >
              Enter Dashboard
            </button>
            <div className="hidden items-center gap-2 rounded-full border border-border bg-secondary/40 py-1 pl-1 pr-3 md:flex">
              <div className="h-7 w-7 overflow-hidden rounded-full border border-white/10">
                <img src={avatarUrl} referrerPolicy="no-referrer" alt="Profile" className="h-full w-full object-cover" />
              </div>
              <span className="text-xs font-semibold">{displayName}</span>
            </div>
          </div>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-lg border border-border bg-secondary/40 px-5 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Login
            </Link>
            <Link href="/register" className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold">
              Join Insiders
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="home" className="grid grid-cols-1 items-center gap-10 pt-8 lg:grid-cols-2 animate-[fadeIn_0.3s_ease-out]">
      <div>
        <div className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-4 py-1.5 text-xs font-semibold tracking-wider">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          WELCOME TO HANO INSIDERS
        </div>
        <h1 className="mt-6 font-display text-6xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
          Insights that
          <br />
          <span className="text-gradient">move</span> the market.
        </h1>
        <p className="mt-6 max-w-md text-muted-foreground">
          Premium market intelligence, educational insights, and short market analysis built for serious beginners who want clarity without hype.
        </p>

        <div className="mt-8 flex flex-wrap gap-6">
          <MiniFeature icon={<Box className="h-5 w-5" />} title="Actionable Context" sub="Stay ahead of the curve" />
          <MiniFeature icon={<BarChart3 className="h-5 w-5" />} title="Market Analysis" sub="Curated data, explained simply" />
          <MiniFeature icon={<FileText className="h-5 w-5" />} title="Member Briefings" sub="Short takes on what matters" />
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <a href="#pricing" className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold">
            Start Your Edge <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="#about"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            Learn More
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary">
              <Play className="h-3 w-3 fill-primary-foreground text-primary-foreground" />
            </span>
          </a>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <div className="flex -space-x-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-gradient-to-br from-primary to-primary/40" />
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            Trusted by 1,250+ serious members
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-3xl" />
        <Image
          src={heroMascot}
          alt="Hano Insiders mascot"
          width={1024}
          height={1024}
          className="mx-auto w-full max-w-xl rounded-[2rem] object-cover"
          priority
        />
      </div>
    </section>
  );
}

function MiniFeature({
  icon,
  title,
  sub,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary/40 text-primary">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function useCountdown() {
  const [t, setT] = useState({ d: 19, h: 14, m: 32, s: 45 });

  useEffect(() => {
    const id = window.setInterval(() => {
      setT((prev) => {
        let { d, h, m, s } = prev;
        s -= 1;
        if (s < 0) {
          s = 59;
          m -= 1;
        }
        if (m < 0) {
          m = 59;
          h -= 1;
        }
        if (h < 0) {
          h = 23;
          d -= 1;
        }
        if (d < 0) {
          d = 0;
          h = 0;
          m = 0;
          s = 0;
        }
        return { d, h, m, s };
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  return t;
}

function Pricing({
  handleCheckout,
  isLoading,
  activePlan,
  userEmail,
}: {
  handleCheckout: (plan: string, offer?: string) => Promise<void>;
  isLoading: boolean;
  activePlan: string | null;
  userEmail: string | null;
}) {
  const t = useCountdown();
  const blocks = [
    { v: t.d, l: "DAYS" },
    { v: t.h, l: "HRS" },
    { v: t.m, l: "MINS" },
    { v: t.s, l: "SECS" },
  ];

  return (
    <section id="pricing" className="mt-24 card-surface p-8 md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="text-xs font-semibold tracking-[0.2em] text-primary">LIMITED TIME OFFER</div>
          <h2 className="mt-2 text-3xl font-extrabold md:text-4xl">Early Bird Lifetime Access</h2>
          <p className="mt-2 text-sm text-muted-foreground">Lock in your lifetime membership before spots run out.</p>
        </div>
        <div className="flex gap-3">
          {blocks.map((b) => (
            <div key={b.l} className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-border bg-secondary/40">
              <div className="font-display text-xl font-bold tabular-nums">{String(b.v).padStart(2, "0")}</div>
              <div className="text-[9px] tracking-wider text-muted-foreground">{b.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        <PlanCard
          title="Regular Price"
          price="$65-70"
          unit="/ month"
          features={[
            "Full access to all insights and articles",
            "Exclusive insider content",
            "Early access to new features",
            "Cancel anytime",
          ]}
          onClick={() => handleCheckout("monthly")}
          isLoading={isLoading && activePlan === "monthly"}
        />
        <PlanCard
          highlighted
          badge="ONLY 20 SPOTS"
          title="Early Bird Lifetime"
          price="$50"
          unit="/ lifetime"
          strike="$65-70 / month"
          features={[
            "Full access to all insights and articles",
            "Exclusive insider content",
            "Early access to new features",
            "Cancel anytime",
          ]}
          onClick={() => handleCheckout("monthly", "early_bird")}
          isLoading={isLoading && activePlan === "early_bird"}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="card-surface flex items-center justify-between p-5">
          <div>
            <div className="font-semibold">Card Payments</div>
            <div className="mt-1 text-xs text-muted-foreground">Powered by Stripe. Secure and auto-renewal.</div>
          </div>
          <div className="font-display text-2xl font-bold italic text-primary">stripe</div>
        </div>
        <div className="card-surface flex items-center justify-between p-5">
          <div>
            <div className="font-semibold">Crypto Payments</div>
            <div className="mt-1 text-xs text-muted-foreground">Manual payments with reminder emails before your plan expires.</div>
          </div>
          <a
            href={`mailto:hannah@hanoanimations.com?subject=Hano%20Insiders%20manual%20crypto%20payment&body=I%20would%20like%20to%20subscribe%20using%20crypto.%20Registered%20email:%20${encodeURIComponent(userEmail || "")}`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold hover:bg-white/10 transition-colors"
          >
            <Mail className="h-4 w-4" /> Email support
          </a>
        </div>
      </div>
    </section>
  );
}

function CoinDot({ color, letter }: { color: string; letter: string }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: color }}>
      {letter}
    </div>
  );
}

function PlanCard({
  title,
  price,
  unit,
  strike,
  features,
  highlighted,
  badge,
  onClick,
  isLoading,
}: {
  title: string;
  price: string;
  unit: string;
  strike?: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  onClick?: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className={`relative card-surface p-7 flex flex-col justify-between min-h-[340px] ${highlighted ? "ring-glow" : ""}`}>
      {badge ? (
        <div className="absolute -top-3 left-6 rounded-md bg-primary px-3 py-1 text-[10px] font-bold tracking-wider text-primary-foreground">
          {badge}
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className={`text-sm ${highlighted ? "font-semibold text-primary" : "text-muted-foreground"}`}>{title}</div>
          <div className="mt-3 flex flex-wrap items-baseline gap-2">
            <span className="font-display text-4xl font-extrabold">{price}</span>
            <span className="text-sm text-muted-foreground">{unit}</span>
            {strike ? <span className="text-xs text-muted-foreground line-through">{strike}</span> : null}
          </div>
          <ul className="mt-5 space-y-2.5 text-sm">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> {f}
              </li>
            ))}
          </ul>
        </div>
        {highlighted ? (
          <Image
            src={birdMascot}
            alt=""
            width={512}
            height={512}
            className="hidden h-32 w-32 rounded-2xl object-cover md:block"
          />
        ) : null}
      </div>
      <button
        onClick={onClick}
        disabled={isLoading}
        className="mt-6 w-full btn-primary py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CreditCard className="h-3.5 w-3.5" />
        )}
        Subscribe Now
      </button>
    </div>
  );
}

function Features() {
  const items = [
    { icon: TrendingUp, title: "Market Overview", desc: "Real-time market data and curated key metrics." },
    { icon: Zap, title: "Insights", desc: "Short, sharp takes on what matters most." },
    { icon: FileText, title: "Articles", desc: "In-depth research and high-quality analysis." },
    { icon: UserPlus, title: "Affiliate", desc: "Referral tools and member discount tracking." },
    { icon: Headphones, title: "Support", desc: "Member support and account help when needed." },
    { icon: Settings, title: "Settings", desc: "Manage profile, billing, and preferences." },
  ];

  return (
    <section id="features" className="mt-24 text-center">
      <h2 className="text-3xl font-extrabold md:text-4xl">Everything You Need to Stay Ahead</h2>
      <p className="mt-2 text-sm text-muted-foreground">A premium dashboard built for crypto insiders.</p>
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {items.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card-surface p-5 text-left transition-colors hover:border-primary/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="mt-4 font-semibold">{title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="mt-12 card-surface p-6 md:p-8">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="text-xs font-semibold tracking-[0.2em] text-primary">ABOUT HANO INSIDERS</div>
          <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">Built for serious beginners who want clarity, not chaos.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            Hano Insiders gives members a curated market overview, coin pages, educational insights, and short market articles in one premium dashboard. It is designed to help people understand the market faster without signals language, hype, or trading-room noise.
          </p>
        </div>
        <div className="space-y-3 text-sm">
          {[
            "Dashboard, market overview, insights, articles, affiliate, support, and settings",
            "Subscriber-only access to all member content",
            "Educational analysis only - not financial advice",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/25 p-4">
              <Check className="h-4 w-4 shrink-0 text-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <section className="mt-12 card-surface p-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[200px_1fr_1fr_1fr]">
        <div className="card-surface bg-background/40 p-4">
          <HanoWordmark />
          <nav className="mt-6 space-y-1 text-sm">
            <SideItem icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" active />
            <SideItem icon={<TrendingUp className="h-4 w-4" />} label="Market Overview" />
            <SideItem icon={<Zap className="h-4 w-4" />} label="Insights" badge="New" />
            <SideItem icon={<FileText className="h-4 w-4" />} label="Articles" />
            <SideItem icon={<UserPlus className="h-4 w-4" />} label="Affiliate" />
            <SideItem icon={<Headphones className="h-4 w-4" />} label="Support" />
            <SideItem icon={<Settings className="h-4 w-4" />} label="Settings" />
          </nav>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Market Overview</div>
            <div className="flex items-center gap-1.5 text-xs text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs text-muted-foreground">Total Market Cap</div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold">$2.49T</span>
              <span className="text-xs text-success">+2.35%</span>
            </div>
          </div>
          <PreviewSparkline />
          <div className="mt-4 grid grid-cols-4 gap-2 text-[10px]">
            {[
              { s: "BTC", p: "$67,892.21", c: "+1.23%", color: "#f7931a", l: "B" },
              { s: "ETH", p: "$3,456.78", c: "+2.01%", color: "#627eea", l: "E" },
              { s: "SOL", p: "$155.32", c: "+3.66%", color: "#14f195", l: "S" },
              { s: "BNB", p: "$598.11", c: "+1.18%", color: "#f3ba2f", l: "B" },
            ].map((c) => (
              <div key={c.s} className="rounded-lg border border-border bg-background/40 p-2">
                <div className="flex items-center gap-1">
                  <div className="flex h-3 w-3 items-center justify-center rounded-full text-[8px] text-white" style={{ background: c.color }}>
                    {c.l}
                  </div>
                  <span className="font-semibold">{c.s}</span>
                </div>
                <div className="mt-1 font-semibold">{c.p}</div>
                <div className="text-success">{c.c}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Insights</div>
            <button className="text-xs text-muted-foreground hover:text-foreground">View all</button>
          </div>
          <div className="mt-4 space-y-3">
            {[
              { t: "Bitcoin Macro Trend Shift?", time: "2h ago", tag: "BTC", color: "#f7931a", l: "B" },
              { t: "Why Altcoins Are Quiet Before The Next Move", time: "5h ago", tag: "ALT", color: "#627eea", l: "A" },
              { t: "This On-Chain Signal Has Nailed Every Bottom", time: "1d ago", tag: "ON-CHAIN", color: "#14f195", l: "O" },
            ].map((i) => (
              <div key={i.t} className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs text-white" style={{ background: i.color }}>
                  {i.l}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold">{i.t}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{i.time}</div>
                </div>
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-semibold tracking-wider">{i.tag}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface p-5">
          <div className="font-semibold">Latest Article</div>
          <Image src={articleCover} alt="" width={800} height={512} className="mt-4 aspect-video w-full rounded-lg object-cover" />
          <div className="mt-3 text-sm font-semibold">The Institutions Are Coming to Crypto</div>
          <div className="mt-1 text-xs text-muted-foreground">
            A deep dive into how traditional finance is entering the space and what it means for retail investors.
          </div>
          <div className="mt-3 text-[10px] text-muted-foreground">May 4, 2025 | 8 min read</div>
        </div>
      </div>
    </section>
  );
}

function SideItem({
  icon,
  label,
  active,
  badge,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <span
      className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${active ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      {badge ? <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">{badge}</span> : null}
    </span>
  );
}

function PreviewSparkline() {
  const pts = [10, 18, 14, 22, 20, 28, 26, 34, 32, 40, 38, 48, 46, 56, 54, 64];
  const w = 320;
  const h = 80;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i / (pts.length - 1)) * w} ${h - ((p - min) / (max - min || 1)) * h}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-20 w-full">
      <defs>
        <linearGradient id="landingSparkline" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.72 0.26 305)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="oklch(0.72 0.26 305)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill="url(#landingSparkline)" />
      <path d={d} fill="none" stroke="oklch(0.72 0.26 305)" strokeWidth="2" />
    </svg>
  );
}

function Faqs() {
  const items = [
    {
      q: "Who is Hano Insiders for?",
      a: "It is built for serious beginners who want curated crypto intelligence, educational explainers, and premium member-only market context.",
    },
    {
      q: "Is this a signals group?",
      a: "No. Hano Insiders does not provide buy or sell signals. The product is focused on education and market analysis.",
    },
    {
      q: "What do members get?",
      a: "Members get dashboard access, market overview, coin pages, insights, articles, affiliate tools, support, and account settings.",
    },
  ];

  return (
    <section id="faqs" className="mt-12 card-surface p-6 md:p-8">
      <div className="text-xs font-semibold tracking-[0.2em] text-primary">FAQS</div>
      <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">Common questions, answered clearly.</h2>
      <div className="mt-8 grid gap-4">
        {items.map((item) => (
          <div key={item.q} className="rounded-2xl border border-border bg-secondary/20 p-5">
            <div className="text-sm font-semibold">{item.q}</div>
            <div className="mt-2 text-sm leading-7 text-muted-foreground">{item.a}</div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs leading-6 text-muted-foreground">
        Hano Insiders provides educational content and market analysis only. Nothing on this platform is financial advice.
      </p>
    </section>
  );
}

function CTA() {
  return (
    <section className="mt-12 card-surface relative overflow-hidden p-6 md:p-8">
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Image src={heroMascot} alt="" width={1024} height={1024} className="h-20 w-20 rounded-lg object-cover" />
          <div>
            <h3 className="text-xl font-extrabold md:text-2xl">Be early. Be informed. Be unstoppable.</h3>
            <p className="mt-1 text-sm text-muted-foreground">Join the first 20 members and lock in your lifetime rate forever.</p>
          </div>
        </div>
        <Link href="/register" className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold">
          Join Hano Insiders <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
