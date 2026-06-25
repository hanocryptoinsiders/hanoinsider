import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { UserList } from "./UserList";

export const revalidate = 0; // Disable component cache to fetch up-to-date user registrations
export default async function AdminUsersPage() {
  const { user } = await requireAdmin();
  
  return (
    <>
      <PageHeader kicker="ADMIN CONTROL" title="Manage members & roles." />
      <Suspense fallback={<div className="panel p-5 animate-pulse"><div className="h-10 w-full bg-muted rounded mb-4"></div><div className="h-64 w-full bg-muted rounded"></div></div>}>
        <UsersDataFetcher currentAdminId={user.id} />
      </Suspense>
    </>
  );
}

async function UsersDataFetcher({ currentAdminId }: { currentAdminId: string }) {
  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, is_premium, subscription_status, created_at, status")
    .order("created_at", { ascending: false })
    .range(0, 49);

  if (error) {
    console.error("Error loading user profiles in admin panel:", error);
  }

  const users = (profiles || []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    avatar_url: p.avatar_url,
    role: p.role || "free",
    is_premium: p.is_premium || false,
    subscription_status: p.subscription_status || "inactive",
    created_at: p.created_at,
    status: p.status || "active",
  }));

  return <UserList initialUsers={users} currentAdminId={currentAdminId} />;
}
