import Image from "next/image";
import Link from "next/link";
import { BadgePercent, CircleCheck, CirclePlay, LineChart, type LucideIcon } from "lucide-react";

const trustSignals: { label: string; icon: LucideIcon }[] = [
  { label: "Actionable Content", icon: CircleCheck },
  { label: "Market Analysis", icon: LineChart },
  { label: "Member Savings", icon: BadgePercent },
];

const memberAvatars = [
  {
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&h=96&q=80",
    alt: "Hano Insiders member",
  },
  {
    src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80",
    alt: "Hano Insiders member",
  },
  {
    src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=96&h=96&q=80",
    alt: "Hano Insiders member",
  },
  {
    src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=96&h=96&q=80",
    alt: "Hano Insiders member",
  },
];

export function Hero() {
  return (
    <section className="hero-section">
      <div className="hero-wide">
        <div className="eyebrow">
          <span className="pulse-dot" />
          <span className="acc">Welcome to Hano Insiders</span>
        </div>

        <h1 className="hero-headline">
          Insights that{" "}
          <em>move</em> the market.
        </h1>

        <p className="hero-stand">
          Clean, built-from-scratch intelligence, market analysis, and editorial research —
          built for serious beginners who want{" "}
          <span className="acc">clarity without the chaos</span>.
          Not AI-generated. Hand-curated by the desk.
        </p>

        <div className="hero-trust-row">
          {trustSignals.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="hero-trust-item">
                <span className="hero-trust-icon">
                  <Icon size={14} strokeWidth={2} aria-hidden />
                </span>
                <span className="hero-trust-label">{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="cta-row">
          <Link href="/register" className="cta-primary cta-gradient">
            Start Your Edge <span className="arr">→</span>
          </Link>
          <a href="#about" className="cta-secondary cta-secondary--learn">
            Learn More{" "}
            <span className="cta-play-icon" aria-hidden="true">
              <CirclePlay size={22} strokeWidth={2.5} />
            </span>
          </a>
        </div>

        <div className="hero-social-proof">
          <div className="hero-avatar-stack">
            {memberAvatars.map((avatar, i) => (
              <div
                key={avatar.src}
                className="hero-avatar"
                style={{ zIndex: memberAvatars.length - i }}
              >
                <Image
                  src={avatar.src}
                  alt={avatar.alt}
                  width={32}
                  height={32}
                  className="hero-avatar-img"
                />
              </div>
            ))}
          </div>
          <div className="hero-stars">
            {"★★★★★".split("").map((s, i) => (
              <span key={i} className="hero-star">{s}</span>
            ))}
          </div>
          <span className="hero-social-text">
            Trusted by serious crypto beginners worldwide
          </span>
        </div>
      </div>
    </section>
  );
}
