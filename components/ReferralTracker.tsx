"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

function TrackerContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) return;

    // Referral links must land on /pricing first.
    if (pathname !== "/pricing") {
      router.replace(`/pricing?ref=${encodeURIComponent(ref)}`);
      return;
    }

    // HanoPricing handles click tracking + banner on the pricing page.
  }, [searchParams, pathname, router]);

  return null;
}

export function ReferralTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerContent />
    </Suspense>
  );
}
