import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Users, FileText, DollarSign, Eye, TrendingUp, Gift, ShoppingCart, Activity, ShieldAlert, CreditCard, MessageSquare, Video } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { Sparkline } from "@/components/dashboard/Sparkline";

export const revalidate = 0; // Disable server component cache for real-time dashboard stats

export default function AdminHome() {
  return (
    <>
      <PageHeader kicker="ADMIN OVERVIEW" title="Platform health, at a glance." />

      <Suspense fallback={<AdminKPISkeleton />}>
        <AdminKPIs />
      </Suspense>

      <section className="panel p-6 mt-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground">REVENUE Â· LAST 30D</p>
            <p className="font-display text-4xl mt-2">$48,210</p>
            <p className="text-success text-xs">+8.4% vs prev. period</p>
          </div>
          <div className="flex gap-1 text-xs text-muted-foreground">
            {["7D", "30D", "90D", "1Y"].map((t) => (
              <button key={t} className={`px-2.5 py-1 rounded ${t === "30D" ? "bg-accent text-foreground" : "hover:text-foreground"}`}>{t}</button>
            ))}
          </div>
        </div>
        <Sparkline height={180} points={[20,24,22,28,26,32,30,38,34,42,40,48,44,52,50,58,55,62,60,68,65,72,70,78,75,82,80,88,85,92]} stroke="oklch(0.92 0 0)" fill="oklch(0.92 0 0)" className="mt-4" />
      </section>
    </>
  );
}

function AdminKPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="panel p-6">
          <div className="h-4 w-4 bg-muted rounded mb-3"></div>
          <div className="h-2.5 w-24 bg-muted rounded mb-2"></div>
          <div className="h-8 w-16 bg-muted rounded mb-1"></div>
          <div className="h-3 w-32 bg-muted rounded mb-3"></div>
          <div className="h-7 w-full bg-muted rounded"></div>
        </div>
      ))}
    </div>
  );
}

async function AdminKPIs() {
  const supabase = await createClient();

  // Safe query count helper
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

  // Fetch real counts from all tables in parallel
  const [
    totalUsers,
    premiumUsers,
    freeUsers,
    activeSubs,
    publishedInsights,
    publishedArticles,
    publishedVideos,
    totalAffiliates,
    totalComments,
  ] = await Promise.all([
    runCount(supabase.from("profiles").select("id", { count: "exact", head: true })),
    runCount(supabase.from("profiles").select("id", { count: "exact", head: true }).or("is_premium.eq.true,role.eq.premium,role.eq.admin")),
    runCount(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "free")),
    runCount(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("subscription_status", "active")),
    runCount(supabase.from("content_items").select("id", { count: "exact", head: true }).eq("content_type", "insight").eq("status", "published")),
    runCount(supabase.from("content_items").select("id", { count: "exact", head: true }).eq("content_type", "article").eq("status", "published")),
    runCount(supabase.from("content_items").select("id", { count: "exact", head: true }).eq("content_type", "video").eq("status", "published")),
    runCount(supabase.from("affiliates").select("id", { count: "exact", head: true })),
    runCount(supabase.from("content_comments").select("id", { count: "exact", head: true })),
  ]);

  const kpis = [
    { label: "Total Users", value: totalUsers.toLocaleString(), change: "All registrations", icon: Users, up: true },
    { label: "Premium Users", value: premiumUsers.toLocaleString(), change: "PRO & Member members", icon: Eye, up: true },
    { label: "Free Users", value: freeUsers.toLocaleString(), change: "Standard members", icon: Activity, up: true },
    { label: "Active Subscriptions", value: activeSubs.toLocaleString(), change: "Live subscriptions", icon: CreditCard, up: true },
    { label: "Published Insights", value: publishedInsights.toLocaleString(), change: "Insights in feed", icon: FileText, up: true },
    { label: "Published Articles", value: publishedArticles.toLocaleString(), change: "Educational guides", icon: FileText, up: true },
    { label: "Published Videos", value: publishedVideos.toLocaleString(), change: "Uploaded video guides", icon: Video, up: true },
    { label: "Total Affiliates", value: totalAffiliates.toLocaleString(), change: "Referral partners", icon: Gift, up: true },
    { label: "Total Comments", value: totalComments.toLocaleString(), change: "Community comments", icon: MessageSquare, up: true },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <div key={k.label} className="panel p-6 animate-fade-in">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <p className="text-[10px] tracking-wider text-muted-foreground mt-3 uppercase">{k.label}</p>
            <p className="font-display mt-2 text-3xl">{k.value}</p>
            <p className={`text-xs mt-1 ${k.up ? "text-success" : "text-destructive"}`}>{k.change}</p>
            <Sparkline height={28} stroke="oklch(0.78 0.18 150)" fill="oklch(0.78 0.18 150)" className="mt-3" />
          </div>
        );
      })}
    </div>
  );
}
