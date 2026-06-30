"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getServiceSupabaseSafe } from "@/lib/supabase/service";

export type SupportTicketStatus = "open" | "pending" | "closed";

export type AdminSupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  user_email: string | null;
  user_name: string | null;
};

export type FetchSupportTicketsResult = {
  tickets: AdminSupportTicket[];
  error?: string;
};

const updateSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(["open", "pending", "closed"]).optional(),
  adminResponse: z.string().max(5000).optional(),
});

function mapTicketRow(row: Record<string, unknown>): AdminSupportTicket {
  const rawProfile = row.profiles as Record<string, unknown> | Record<string, unknown>[] | null;
  const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;

  return {
    id: row.id as string,
    user_id: row.user_id as string,
    subject: row.subject as string,
    message: row.message as string,
    status: row.status as SupportTicketStatus,
    admin_response: (row.admin_response as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    user_email: (profile?.email as string | null) ?? null,
    user_name: (profile?.full_name as string | null) ?? null,
  };
}

export async function fetchAdminSupportTickets(): Promise<FetchSupportTicketsResult> {
  await requireAdmin();

  const service = getServiceSupabaseSafe();
  if (service.error || !service.supabase) {
    return {
      tickets: [],
      error:
        "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing on the host.",
    };
  }

  const supabase = service.supabase;

  const { data, error } = await supabase
    .from("support_tickets")
    .select(
      `
      id,
      user_id,
      subject,
      message,
      status,
      admin_response,
      created_at,
      updated_at,
      profiles!user_id (
        email,
        full_name
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[admin/support] fetch error:", error.message);
    return { tickets: [], error: error.message };
  }

  return { tickets: (data ?? []).map((row) => mapTicketRow(row as Record<string, unknown>)) };
}

export async function updateSupportTicketAction(input: {
  ticketId: string;
  status?: SupportTicketStatus;
  adminResponse?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  await requireAdmin();

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid ticket update." };
  }

  const { ticketId, status, adminResponse } = parsed.data;
  if (!status && adminResponse === undefined) {
    return { success: false, error: "Nothing to update." };
  }

  const service = getServiceSupabaseSafe();
  if (service.error || !service.supabase) {
    return { success: false, error: "Server configuration error." };
  }

  const supabase = service.supabase;
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (status) payload.status = status;
  if (adminResponse !== undefined) {
    payload.admin_response = adminResponse.trim() || null;
  }

  const { error } = await supabase.from("support_tickets").update(payload).eq("id", ticketId);

  if (error) {
    console.error("[admin/support] update error:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/support");
  return { success: true };
}
