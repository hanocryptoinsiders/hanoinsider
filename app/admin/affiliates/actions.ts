"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Helper: Ensure the active user is an admin
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile || profile.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  return { supabase, adminId: user.id };
}

// 1. Create a new affiliate account
export async function createAffiliateAction(data: {
  name: string;
  email?: string;
  referral_code: string;
  commission_rate: number;
  status: "active" | "disabled";
  payout_method?: string;
  payout_details?: string;
  notes?: string;
  user_id?: string | null;
}) {
  const { supabase } = await requireAdmin();

  // Validate referral code
  const code = data.referral_code.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
  if (!code) {
    throw new Error("Referral code must contain only lowercase alphanumeric characters, hyphens, or underscores");
  }

  // Validate commission rate
  if (data.commission_rate < 0 || data.commission_rate > 1) {
    throw new Error("Commission rate must be between 0 and 1 (inclusive)");
  }

  const { error } = await supabase
    .from("affiliates")
    .insert({
      name: data.name.trim(),
      email: data.email?.trim() || null,
      referral_code: code,
      commission_rate: data.commission_rate,
      status: data.status,
      payout_method: data.payout_method || null,
      payout_details: data.payout_details || null,
      notes: data.notes || null,
      user_id: data.user_id || null,
    });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Referral code is already taken");
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin/affiliates");
  return { success: true };
}

// 2. Update an existing affiliate
export async function updateAffiliateAction(
  id: string,
  data: {
    name: string;
    email?: string;
    referral_code: string;
    commission_rate: number;
    status: "active" | "disabled";
    payout_method?: string;
    payout_details?: string;
    notes?: string;
    user_id?: string | null;
  }
) {
  const { supabase } = await requireAdmin();

  const code = data.referral_code.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
  if (!code) {
    throw new Error("Referral code must contain only lowercase alphanumeric characters, hyphens, or underscores");
  }

  if (data.commission_rate < 0 || data.commission_rate > 1) {
    throw new Error("Commission rate must be between 0 and 1");
  }

  const { error } = await supabase
    .from("affiliates")
    .update({
      name: data.name.trim(),
      email: data.email?.trim() || null,
      referral_code: code,
      commission_rate: data.commission_rate,
      status: data.status,
      payout_method: data.payout_method || null,
      payout_details: data.payout_details || null,
      notes: data.notes || null,
      user_id: data.user_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      throw new Error("Referral code is already taken");
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin/affiliates");
  return { success: true };
}

// 3. Toggle status of an affiliate
export async function toggleAffiliateStatusAction(id: string, status: "active" | "disabled") {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("affiliates")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/affiliates");
  return { success: true };
}

// 4. Approve a pending commission
export async function approveCommissionAction(id: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("affiliate_commissions")
    .update({
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/affiliates");
  return { success: true };
}

// 5. Cancel a commission
export async function cancelCommissionAction(id: string, notes?: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("affiliate_commissions")
    .update({
      status: "cancelled",
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/affiliates");
  return { success: true };
}

// 6. Mark commission as paid manually
export async function markCommissionPaidAction(
  id: string,
  payoutData: {
    method: string;
    reference: string;
    notes?: string;
  }
) {
  const { supabase, adminId } = await requireAdmin();

  // Fetch commission details first
  const { data: commission, error: fetchError } = await supabase
    .from("affiliate_commissions")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !commission) {
    throw new Error("Commission record not found");
  }

  if (commission.status === "paid") {
    throw new Error("Commission is already marked as paid");
  }

  // A. Create record in affiliate_payouts
  const { error: payoutError } = await supabase
    .from("affiliate_payouts")
    .insert({
      affiliate_id: commission.affiliate_id,
      amount: commission.commission_amount,
      currency: commission.payment_currency,
      method: payoutData.method.trim(),
      payout_reference: payoutData.reference.trim(),
      status: "paid",
      notes: payoutData.notes?.trim() || null,
      paid_at: new Date().toISOString(),
      created_by: adminId,
    });

  if (payoutError) {
    throw new Error(`Failed to log payout details: ${payoutError.message}`);
  }

  // B. Update commission record
  const { error: commissionError } = await supabase
    .from("affiliate_commissions")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payout_reference: payoutData.reference.trim(),
      notes: payoutData.notes ? `${commission.notes || ""}\n[Payout Note]: ${payoutData.notes.trim()}` : commission.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (commissionError) {
    throw new Error(`Failed to update commission record: ${commissionError.message}`);
  }

  revalidatePath("/admin/affiliates");
  return { success: true };
}
