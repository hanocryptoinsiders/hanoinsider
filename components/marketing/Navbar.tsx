"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const { user, profile, isPremium } = useAuth();
  const router = useRouter();

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

  return (
    <header className="topbar">
      <Link href="/" className="logo-text" style={{ padding: "8px 0", display: "inline-block" }}>
        <span className="acc">Hano</span> Insiders
      </Link>

      {user ? (
        <button onClick={handleEnterDashboard} className="topbar-action">
          Dashboard <span className="arr">→</span>
        </button>
      ) : (
        <Link href="/register" className="topbar-action">
          Join Insiders <span className="arr">→</span>
        </Link>
      )}
    </header>
  );
}
