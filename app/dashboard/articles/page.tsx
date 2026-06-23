import { Suspense } from "react";
import { getContentItems } from "@/lib/content";
import { ArticlesClient } from "./ArticlesClient";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { CardGridSkeleton } from "@/components/loading/skeletons";

export default function ArticlesPage() {
  return (
    <>
      <PageHeader kicker="ARTICLES" title="Short market analysis." desc="Concise articles that explain what is moving and why without financial advice." />
      <Suspense fallback={<CardGridSkeleton />}>
        <ArticlesDataFetcher />
      </Suspense>
    </>
  );
}

async function ArticlesDataFetcher() {
  const articles = await getContentItems("article");
  return <ArticlesClient initialArticles={articles} />;
}
