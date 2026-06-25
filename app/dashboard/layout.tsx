/**
 * Dashboard Layout — Server Component
 *
 * This layout runs on the server. It calls `requireAuth()` before
 * rendering any children, so unauthenticated users are redirected
 * to /login at the network edge — before any HTML is sent.
 *
 * The existing client-side DashboardLayout component (sidebar, nav,
 * tier toggle, etc.) is rendered as a child for all auth'd users.
 */

import { requirePremium } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Server-side guard: unauthenticated → /login (hard redirect, no flash)
  await requirePremium();

  return <DashboardLayout>{children}</DashboardLayout>;
}
