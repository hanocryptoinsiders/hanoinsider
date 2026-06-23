import { Suspense } from "react";
import { getContentItems } from "@/lib/content";
import { InsightsClient } from "./InsightsClient";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { CardGridSkeleton } from "@/components/loading/skeletons";

export default function InsightsPage() {
  return (
    <>
      <PageHeader kicker="INSIGHTS" title="Educational insights." desc="Long-form explainers and research notes for understanding crypto clearly." />
      <Suspense fallback={<CardGridSkeleton />}>
        <InsightsDataFetcher />
      </Suspense>
    </>
  );
}

async function InsightsDataFetcher() {
  const insights = await getContentItems("insight");
  return <InsightsClient initialInsights={insights} />;
}
