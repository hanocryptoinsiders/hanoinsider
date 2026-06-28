import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";
import { buildWelcomeEmail } from "@/lib/email/welcome-email";
import { PLANS, type PlanId } from "@/lib/payments";

type SB = SupabaseClient<any, any, any>;

function planLabel(planId?: string | null): string {
  if (!planId) return "membership";
  const id = planId as PlanId;
  return PLANS[id]?.name ?? planId;
}

/**
 * Sends a one-time welcome email after Stripe confirms payment.
 * Idempotent per email address via welcome_email_log.
 */
export async function sendWelcomeEmailIfNeeded(
  supabase: SB,
  args: {
    email: string;
    firstName?: string | null;
    planId?: string | null;
    checkoutSessionId?: string | null;
  },
): Promise<void> {
  const email = args.email.trim().toLowerCase();
  if (!email) return;

  const { data: existing } = await supabase
    .from("welcome_email_log")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) return;

  const built = buildWelcomeEmail({
    firstName: args.firstName,
    planLabel: planLabel(args.planId),
  });

  const result = await sendEmail({
    to: email,
    subject: built.subject,
    html: built.html,
    text: built.text,
    tags: [{ name: "type", value: "welcome" }],
  });

  if (result.skipped) {
    console.warn("[email] Welcome email skipped for", email, result.error);
    return;
  }

  if (result.error) {
    console.error("[email] Welcome email failed for", email, result.error);
    return;
  }

  await supabase.from("welcome_email_log").insert({
    email,
    stripe_checkout_session_id: args.checkoutSessionId ?? null,
    resend_id: result.id,
  });
}
