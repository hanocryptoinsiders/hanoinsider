import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Users, FileText, Eye, Gift, CreditCard, MessageSquare, Video, Activity } from "lucide-react";

export const revalidate = 0;

export default function AdminHome() {
  return (
    <Suspense fallback={<AdminKPISkeleton />}>
      <AdminKPIs />
    </Suspense>
  );
}

function AdminKPISkeleton() {
  return (
    <div className="dash-admin-kpi-grid animate-pulse">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="dash-admin-kpi">
          <div className="h-4 w-4 rounded bg-white/5" />
          <div className="h-2.5 w-24 rounded bg-white/5" />
          <div className="h-8 w-16 rounded bg-white/5" />
          <div className="h-3 w-32 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}

async function AdminKPIs() {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runCount = async (query: any) => {
    try {
      const { count, error } = await query;
      if (error) {
        console.error("Count query error:", error);
        return 0;
      }
      return count ?? 0;
    } catch (e) {
      console.error("Count query exception:", e);
      return 0;
    }
  };

  const [
    totalUsers,
    premiumUsers,
    expiredSubs,
    pendingPayments,
    activeSubs,
    publishedInsights,
    publishedArticles,
    publishedVideos,
    totalReferrers,
    totalComments,
    openSupportTickets,
  ] = await Promise.all([
    runCount(supabase.from("profiles").select("id", { count: "exact", head: true })),
    runCount(supabase.from("profiles").select("id", { count: "exact", head: true }).or("is_premium.eq.true,role.eq.premium,role.eq.admin")),
    runCount(
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .or("subscription_status.eq.expired,subscription_status.eq.cancelled,subscription_status.eq.inactive")
        .eq("is_premium", false),
    ),
    runCount(
      supabase
        .from("paid_customers")
        .select("id", { count: "exact", head: true })
        .in("payment_status", ["pending", "incomplete", "unpaid"]),
    ),
    runCount(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("subscription_status", "active").eq("is_premium", true)),
    runCount(supabase.from("content_items").select("id", { count: "exact", head: true }).eq("content_type", "insight").eq("status", "published")),
    runCount(supabase.from("content_items").select("id", { count: "exact", head: true }).eq("content_type", "article").eq("status", "published")),
    runCount(supabase.from("content_items").select("id", { count: "exact", head: true }).eq("content_type", "video").eq("status", "published")),
    runCount(supabase.from("affiliates").select("id", { count: "exact", head: true }).not("user_id", "is", null)),
    runCount(supabase.from("content_comments").select("id", { count: "exact", head: true })),
    runCount(
      supabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
    ),
  ]);

  const kpis = [
    { label: "Total users", value: totalUsers.toLocaleString(), change: "All registrations", icon: Users, up: true },
    { label: "Active subscribers", value: activeSubs.toLocaleString(), change: "Paid members with access", icon: CreditCard, up: true },
    { label: "Premium users", value: premiumUsers.toLocaleString(), change: "Active paid access", icon: Eye, up: true },
    { label: "Expired subscribers", value: expiredSubs.toLocaleString(), change: "Lapsed memberships", icon: Activity, up: false },
    { label: "Pending payments", value: pendingPayments.toLocaleString(), change: "Awaiting confirmation", icon: CreditCard, up: false },
    { label: "Published insights", value: publishedInsights.toLocaleString(), change: "Insights in feed", icon: FileText, up: true },
    { label: "Published articles", value: publishedArticles.toLocaleString(), change: "Educational guides", icon: FileText, up: true },
    { label: "Published videos", value: publishedVideos.toLocaleString(), change: "Uploaded video guides", icon: Video, up: true },
    { label: "Referral members", value: totalReferrers.toLocaleString(), change: "Members with referral links", icon: Gift, up: true },
    { label: "Total comments", value: totalComments.toLocaleString(), change: "Community comments", icon: MessageSquare, up: true },
    {
      label: "Open support tickets",
      value: openSupportTickets.toLocaleString(),
      change: "Awaiting admin review",
      icon: MessageSquare,
      up: openSupportTickets === 0,
    },
  ];

  return (
    <div className="dash-admin-kpi-grid">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <div key={k.label} className="dash-admin-kpi animate-fade-in">
            <Icon className="dash-admin-kpi-icon" strokeWidth={1.5} />
            <div className="dash-stat-lbl">{k.label}</div>
            <div className="dash-stat-val">{k.value}</div>
            <p className={`dash-admin-kpi-note ${k.up ? "dash-admin-kpi-note--up" : "dash-admin-kpi-note--down"}`}>
              {k.change}
            </p>
          </div>
        );
      })}
    </div>
  );
}
