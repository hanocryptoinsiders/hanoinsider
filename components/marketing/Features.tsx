import {
  BarChart3,
  FileText,
  Headphones,
  Settings,
  Share2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const featureItems: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: BarChart3,
    title: "Market Overview",
    desc: "Real-time market context, sector rotation, and key metrics curated daily.",
  },
  {
    icon: Sparkles,
    title: "Insights",
    desc: "Weekly concise briefs on what moved markets and why it matters.",
  },
  {
    icon: FileText,
    title: "Articles",
    desc: "In-depth research reports on macro trends, on-chain data, and flows.",
  },
  {
    icon: Share2,
    title: "Affiliate",
    desc: "Share the desk and earn referral credit on every signup.",
  },
  {
    icon: Headphones,
    title: "Support",
    desc: "Direct member-only access to the desk for questions and context.",
  },
  {
    icon: Settings,
    title: "Settings",
    desc: "Manage your account, preferences, notifications, and access settings.",
  },
];

export function Features() {
  return (
    <section id="intelligence" className="landing-section">
      <div className="features-head" data-m-reveal>
        <h2 className="features-title">
          Everything You Need to Stay Ahead
        </h2>
        <p className="features-subtitle">
          A premium intelligence toolkit for serious crypto beginners.
        </p>
      </div>

      <div className="features-grid" data-m-reveal data-m-reveal-delay="1">
        {featureItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="feature-card">
              <div className="feature-card-icon">
                <Icon size={18} strokeWidth={1.75} aria-hidden />
              </div>
              <h3 className="feature-card-title">{item.title}</h3>
              <p className="feature-card-desc">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
