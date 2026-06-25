import { HanoDashboardHome } from "@/components/dashboard/HanoDashboardHome";
import { getMarketSnapshot } from "@/lib/market.functions";

export default async function DashboardHome() {
  const initialSnap = await getMarketSnapshot();
  return <HanoDashboardHome initialSnap={initialSnap} />;
}
