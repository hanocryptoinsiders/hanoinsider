import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { confirmStripeCheckoutSession } from "@/lib/stripe/paid-customer";
import { normalizeEmail, isValidEmail } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * Confirms a Stripe Checkout Session server-side and upserts paid_customers
 * immediately — does not wait for the webhook. Called from /register after
 * Stripe redirects with ?session_id=...
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const rawEmail = typeof body.email === "string" ? body.email : "";
    const email = rawEmail ? normalizeEmail(rawEmail) : null;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID.", code: "invalid_session" }, { status: 400 });
    }
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email.", code: "invalid_email" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const result = await confirmStripeCheckoutSession(supabase, sessionId, email);

    if (!result.ok) {
      const status =
        result.code === "stripe_error" || result.code === "missing_email" ? 500 : 400;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    let registrationStatus: "eligible" | "already_registered" | "not_paid" = "not_paid";
    if (result.hasRegistered) {
      registrationStatus = "already_registered";
    } else if (result.paymentStatus === "paid") {
      registrationStatus = "eligible";
    }

    return NextResponse.json({
      success: true,
      email: result.email,
      paymentStatus: result.paymentStatus,
      registrationStatus,
    });
  } catch (error) {
    console.error("[checkout/confirm-session]", error);
    return NextResponse.json(
      { error: "Could not confirm payment.", code: "server_error" },
      { status: 500 },
    );
  }
}
