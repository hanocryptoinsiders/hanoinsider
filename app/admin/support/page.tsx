import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { AdminOverviewSkeleton } from "@/components/loading/skeletons";
import { AdminSupportClient } from "./AdminSupportClient";
import { fetchAdminSupportTickets } from "./actions";

export default function AdminSupportPage() {
  return (
    <>
      <PageHeader
        kicker="SUPPORT"
        title="Member support tickets."
        desc="Track and respond to support requests submitted from the member dashboard."
      />
      <Suspense fallback={<AdminOverviewSkeleton />}>
        <SupportTicketsFetcher />
      </Suspense>
    </>
  );
}

async function SupportTicketsFetcher() {
  const { tickets, error } = await fetchAdminSupportTickets();

  if (error) {
    return (
      <div className="panel p-6 text-sm text-destructive">
        Failed to load support tickets: {error}
      </div>
    );
  }

  return <AdminSupportClient tickets={tickets} />;
}
