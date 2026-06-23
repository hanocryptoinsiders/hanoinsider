import { Suspense } from "react";
import { MarketClient } from "@/components/dashboard/MarketClient";
import { getMarketSnapshot } from "@/lib/market.functions";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { AdminOverviewSkeleton } from "@/components/loading/skeletons";

export default function Market() {
  return (
    <>
      <PageHeader
        kicker="MARKET OVERVIEW"
        title="Curated market context."
        desc="Market cap, dominance, volume, sentiment, RSI context, top movers, and top coin rows for serious beginners."
      />
      <Suspense fallback={<AdminOverviewSkeleton />}>
        <MarketDataFetcher />
      </Suspense>
    </>
  );
}

async function MarketDataFetcher() {
  const snap = await getMarketSnapshot();
  return <MarketClient initialSnap={snap} />;
}
