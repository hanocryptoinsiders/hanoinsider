"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";

function TrackerContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      const runTracker = async () => {
        try {
          const res = await fetch("/api/referrals/click", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              referralCode: ref,
              landingPage: window.location.href,
              referrerUrl: document.referrer || null,
            }),
          });
          const data = await res.json();
          if (data.success) {
            console.log(`[ReferralTracker] Click tracked for code: ${ref}`);
            // Remove ref parameter from the URL address bar cleanly
            const url = new URL(window.location.href);
            url.searchParams.delete("ref");
            window.history.replaceState({}, "", url.pathname + url.search);
          }
        } catch (err) {
          console.error("[ReferralTracker] Error reporting click:", err);
        }
      };

      runTracker();
    }
  }, [searchParams, pathname]);

  return null;
}

export function ReferralTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerContent />
    </Suspense>
  );
}
