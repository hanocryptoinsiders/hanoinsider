"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";
import { useAuth } from "@/lib/auth-context";
import { scrollToSection, useSectionScroll } from "./useSectionScroll";

export function Navbar() {
  const { user, isPremium } = useAuth();
  const router = useRouter();

  const scrollToPricing = useSectionScroll("pricing");

  const handleEnterDashboard = () => {
    if (isPremium) {
      router.push("/dashboard");
    } else {
      if (!scrollToSection("pricing")) {
        router.push("/?renew=1#pricing");
      }
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="topbar-logo-link">
          <LogoMark size={38} priority className="topbar-logo-mark" />
        </Link>

        <div className="topbar-actions">
          {user ? (
            <button onClick={handleEnterDashboard} className="topbar-cta-btn">
              Dashboard <span className="arr">→</span>
            </button>
          ) : (
            <>
              <Link href="/login" className="topbar-action mx-2 topbar-action--plain">
                Log In
              </Link>
              <button type="button" onClick={scrollToPricing} className="topbar-cta-btn">
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
