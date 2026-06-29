import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/callback
 *
 * Server-side route handler that exchanges a Supabase PKCE authorization
 * code for a valid session (setting HTTP-only cookies via @supabase/ssr).
 *
 * This route is the redirect target for:
 *   1. Password-reset emails  (next=/reset-password)
 *   2. OAuth sign-ins (Google, etc.) (next=/dashboard or custom)
 *   3. Email confirmation links
 *
 * Query parameters:
 *   - code:  The PKCE authorization code from Supabase
 *   - next:  Where to redirect after successful exchange (default: /dashboard)
 *   - error / error_code: Supabase-injected error params for failed links
 *
 * Supabase Dashboard → URL Configuration must include this route in the
 * Redirect URLs allowlist:
 *   - http://localhost:3000/**           (local development)
 *   - https://hanoinsiders.com/auth/callback  (production)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // ── Handle Supabase error params (expired/invalid links) ──────────────
  // Supabase appends ?error=...&error_code=... for failed OTP links,
  // expired recovery links, or denied OAuth flows.
  const errorParam = searchParams.get("error");
  if (errorParam) {
    const errorCode = searchParams.get("error_code") ?? "";
    const isLinkError =
      errorCode.includes("otp") ||
      errorCode.includes("expired") ||
      errorCode.includes("invalid") ||
      errorParam === "access_denied";

    const redirectPath = isLinkError
      ? "/login?error=link_expired"
      : "/login?error=auth_callback_failed";

    return NextResponse.redirect(`${origin}${redirectPath}`);
  }

  // ── Exchange PKCE code for session ────────────────────────────────────
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Validate the `next` param to prevent open-redirect attacks:
      // only allow relative paths starting with "/" and not "//".
      const safePath =
        next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      const response = NextResponse.redirect(`${origin}${safePath}`);

      if (safePath === "/reset-password") {
        response.cookies.set("hano_password_recovery", "1", {
          path: "/",
          maxAge: 60 * 60,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }

      return response;
    }

    console.error("[auth/callback] Code exchange failed:", error.message);
  }

  // ── Fallback: no code or exchange failed ──────────────────────────────
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
