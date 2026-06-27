"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const { user, isPremium } = useAuth();
  const router = useRouter();

  const handleEnterDashboard = () => {
    if (isPremium) {
      router.push("/dashboard");
    } else {
      const el = document.getElementById("pricing");
      if (el) el.scrollIntoView({ behavior: "smooth" });
      else router.push("/?renew=1#pricing");
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", padding: "4px 0" }}>
          <Image
            src="/assets/hanoinfrontend/logoMain.png"
            alt="Hano Insiders"
            width={120}
            height={36}
            className="topbar-logo-img"
            priority
          />
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
              <a href="#pricing" className="topbar-cta-btn">
                Get Started
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
