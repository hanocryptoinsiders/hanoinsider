import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site-url";

/**
 * /auth/callback  Supabase auth exchange handler
 *
 * Handles three flows:
 *   1. PKCE code flow       OAuth (Google) and some email links (?code=...)
 *   2. Token-hash flow      Email confirmation (?token_hash=...&type=email)
 *   3. Recovery flow        Password reset (?token_hash=...&type=recovery)
 *
 * Supabase's default email templates send token_hash links, NOT code links.
 * Both flows must be handled here or confirmation/reset will 404 � auth_failed.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteUrl = getSiteUrl();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "email"
    | "recovery"
    | "invite"
    | "magiclink"
    | null;
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // ���� 1. Provider-returned error ��������������������������������������������������������������������������������������������
  if (error) {
    console.error("[auth/callback] Provider error:", error, errorDescription);
    return NextResponse.redirect(
      `${siteUrl}/login?error=oauth_failed`
    );
  }

  const supabase = await createClient();

  // ���� 2. Token-hash flow (email confirmation + password recovery) ��������������������������
  if (tokenHash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (verifyError) {
      console.error("[auth/callback] OTP verify error:", verifyError.message);
      return NextResponse.redirect(
        `${siteUrl}/login?error=link_expired`
      );
    }

    // Password recovery � send to reset-password page (session is now active)
    if (type === "recovery") {
      return NextResponse.redirect(`${siteUrl}/reset-password`);
    }

    // Email confirmation (type === "email") � go to dashboard
    return NextResponse.redirect(`${siteUrl}/dashboard?verified=1`);
  }

  // ���� 3. PKCE code flow (Google OAuth, confirmation URL, recovery URL) ����������������
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("[auth/callback] Code exchange error:", exchangeError.message);
      return NextResponse.redirect(`${siteUrl}/login?error=auth_callback_failed`);
    }

    // Determine target redirect path based on next/type params
    let next = searchParams.get("next");
    if (!next) {
      const type = searchParams.get("type");
      if (type === "recovery") {
        next = "/reset-password";
      } else {
        next = "/dashboard";
      }
    }

    // Safe redirect validation (only allow relative paths, block protocol-relative redirects)
    const safePath = (next.startsWith("/") && !next.startsWith("//")) ? next : "/dashboard";
    return NextResponse.redirect(`${siteUrl}${safePath}`);
  }

  // ���� 4. No recognized params  redirect to login ����������������������������������������������������������
  console.warn("[auth/callback] No code or token_hash found in URL");
  return NextResponse.redirect(`${siteUrl}/login?error=auth_callback_failed`);
}
