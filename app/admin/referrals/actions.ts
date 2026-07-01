"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendReferralRewardCompletedEmail } from "@/lib/email/referral-reward-emails";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Authentication required");

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

export async function completeReferralRewardAction(
  rewardId: string,
  data: {
    transactionHash?: string;
    adminNotes?: string;
  },
) {
  const { supabase, adminId } = await requireAdmin();

  const { data: reward, error: fetchError } = await supabase
    .from("referral_rewards")
    .select(`
      id,
      status,
      reward_amount,
      reward_currency,
      reward_network,
      reward_type,
      referrer_user_id,
      referred_user_id,
      completion_email_sent_at
    `)
    .eq("id", rewardId)
    .single();

  if (fetchError || !reward) {
    throw new Error("Reward not found");
  }

  if (reward.status === "completed") {
    throw new Error("Reward is already completed");
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("referral_rewards")
    .update({
      status: "completed",
      transaction_hash: data.transactionHash?.trim() || null,
      admin_notes: data.adminNotes?.trim() || null,
      paid_at: now,
      completed_by: adminId,
    })
    .eq("id", rewardId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const recipientId =
    reward.reward_type === "referrer_fixed" ? reward.referrer_user_id : reward.referred_user_id;

  if (recipientId && !reward.completion_email_sent_at) {
    const { data: recipient } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", recipientId)
      .maybeSingle();

    if (recipient?.email) {
      await sendReferralRewardCompletedEmail({
        to: recipient.email,
        recipientName: recipient.full_name ?? null,
        rewardType: reward.reward_type === "referrer_fixed" ? "referrer" : "referred",
        amount: parseFloat(String(reward.reward_amount)),
        currency: String(reward.reward_currency),
        network: String(reward.reward_network),
        transactionHash: data.transactionHash?.trim() || null,
      });

      await supabase
        .from("referral_rewards")
        .update({ completion_email_sent_at: now })
        .eq("id", rewardId);
    }
  }

  revalidatePath("/admin/referrals");
  return { success: true };
}

export async function updateReferralRewardNotesAction(rewardId: string, adminNotes: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("referral_rewards")
    .update({ admin_notes: adminNotes.trim() || null })
    .eq("id", rewardId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/referrals");
  return { success: true };
}

export async function cancelReferralRewardAction(rewardId: string, adminNotes?: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("referral_rewards")
    .update({
      status: "rejected",
      admin_notes: adminNotes?.trim() || null,
    })
    .eq("id", rewardId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/referrals");
  return { success: true };
}
