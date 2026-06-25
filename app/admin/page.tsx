import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Users, FileText, Eye, Gift, CreditCard, MessageSquare, Video, Activity } from "lucide-react";
import { Sparkline } from "@/components/dashboard/Sparkline";

export const revalidate = 0;

export default function AdminHome() {
  return (
    <>
      <Suspense fallback={<AdminKPISkeleton />}>
        <AdminKPIs />
      </Suspense>

      <section className="dash-card dash-card--hero">
        <div className="dash-card-head" style={{ marginBottom: 20, paddingBottom: 20 }}>
          <div>
            <p className="dash-card-kicker">
              <span className="acc">Revenue</span>
              <span className="bar" />
              <span>Last 30d</span>
            </p>
            <h2 className="dash-card-title dash-card-title--lg">$48,210</h2>
            <p className="dash-admin-kpi-note dash-admin-kpi-note--up" style={{ marginTop: 8 }}>
              +8.4% vs previous period
            </p>
          </div>
          <div className="dash-range-toggle">
            {["7D", "30D", "90D", "1Y"].map((t) => (
              <button
                key={t}
                type="button"
                className={`dash-range-btn ${t === "30D" ? "dash-range-btn--active" : ""}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <Sparkline
          height={180}
          points={[20, 24, 22, 28, 26, 32, 30, 38, 34, 42, 40, 48, 44, 52, 50, 58, 55, 62, 60, 68, 65, 72, 70, 78, 75, 82, 80, 88, 85, 92]}
          stroke="#9b82dc"
          fill="#9b82dc"
          className="w-full"
        />
      </section>
    </>
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
          <div className="h-7 w-full rounded bg-white/5" />
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
    { label: "Total users", value: totalUsers.toLocaleString(), change: "All registrations", icon: Users, up: true },
    { label: "Premium users", value: premiumUsers.toLocaleString(), change: "Pro & member access", icon: Eye, up: true },
    { label: "Free users", value: freeUsers.toLocaleString(), change: "Standard members", icon: Activity, up: true },
    { label: "Active subscriptions", value: activeSubs.toLocaleString(), change: "Live subscriptions", icon: CreditCard, up: true },
    { label: "Published insights", value: publishedInsights.toLocaleString(), change: "Insights in feed", icon: FileText, up: true },
    { label: "Published articles", value: publishedArticles.toLocaleString(), change: "Educational guides", icon: FileText, up: true },
    { label: "Published videos", value: publishedVideos.toLocaleString(), change: "Uploaded video guides", icon: Video, up: true },
    { label: "Total affiliates", value: totalAffiliates.toLocaleString(), change: "Referral partners", icon: Gift, up: true },
    { label: "Total comments", value: totalComments.toLocaleString(), change: "Community comments", icon: MessageSquare, up: true },
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
            <Sparkline height={28} stroke="#9b82dc" fill="#9b82dc" className="mt-1" />
          </div>
        );
      })}
    </div>
  );
}
