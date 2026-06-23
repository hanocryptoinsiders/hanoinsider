/**
 * Admin Layout â€” Server Component (async)
 *
 * `requireAdmin()` runs on the server before any HTML is sent to the browser:
 *   - Not logged in          â†’ redirect to /login
 *   - Logged in, not admin   â†’ redirect to /dashboard
 *   - Admin                  â†’ render the admin panel UI
 *
 * The visual shell (sidebar, nav, sheets) lives in AdminPanelUI (client component)
 * so we can use hooks there without making this layout "use client".
 */

import { requireAdmin } from "@/lib/auth";
import { AdminPanelUI } from "@/components/admin/AdminPanelUI";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side guard â€” redirects non-admins before rendering anything
  await requireAdmin();

  return <AdminPanelUI>{children}</AdminPanelUI>;
}
