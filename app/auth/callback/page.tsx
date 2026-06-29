"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function LoadingUI() {
  return (
    <div className="min-h-screen bg-noise flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-full bg-foreground/5 border border-border/60 flex items-center justify-center">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground absolute -bottom-1 -right-1" />
        </div>
        <p className="text-sm text-muted-foreground">Completing sign in…</p>
      </div>
    </div>
  );
}

/** Waits up to `timeoutMs` for an active Supabase session via auth events. */
async function waitForSession(
  supabase: ReturnType<typeof import("@/lib/supabase/client").createClient>,
  timeoutMs = 6000
) {
  return new Promise<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]
  >((resolve) => {
    let settled = false;
    let timerId: number | undefined;

    const finish = (
      session: Awaited<
        ReturnType<typeof supabase.auth.getSession>
      >["data"]["session"]
    ) => {
      if (settled) return;
      settled = true;
      if (timerId !== undefined) clearTimeout(timerId);
      subscription.unsubscribe();
      resolve(session);
    };

    // Listen for auth state change events first (Supabase SDK parses hash internally)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (
          nextSession &&
          (event === "INITIAL_SESSION" ||
            event === "SIGNED_IN" ||
            event === "PASSWORD_RECOVERY")
        ) {
          finish(nextSession);
        }
      }
    );

    // Eagerly check for an existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      if (existing) finish(existing);
    });

    // Timeout: one last getSession() before giving up
    timerId = window.setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        finish(s ?? null);
      });
    }, timeoutMs);
  });
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const run = async () => {
      const supabase = createClient();

      // Surface any OAuth error immediately
      const errorParam = searchParams.get("error");
      if (errorParam) {
        router.replace("/login?error=oauth_failed");
        return;
      }

      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") as EmailOtpType | null;
      const next = searchParams.get("next");

      // ── Branch 1: token_hash (PKCE OTP / recovery email link) ────────────
      // Supabase password-reset emails use this format when the redirect URL
      // points to /auth/callback. We verify the OTP here (consuming the token
      // exactly ONCE), set the session cookie, then forward the user onward
      // with a CLEAN URL — no token params reach /reset-password.
      if (tokenHash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });

        if (verifyError) {
          router.replace("/login?error=link_expired");
          return;
        }

        // Session established. Navigate without sensitive params.
        if (type === "recovery") {
          router.replace("/reset-password");
        } else {
          router.replace(
            next && next.startsWith("/") && !next.startsWith("//")
              ? next
              : "/dashboard?verified=1"
          );
        }
        return;
      }

      // ── Branch 2: PKCE authorization code ─────────────────────────────────
      if (code) {
        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          router.replace("/login?error=auth_callback_failed");
          return;
        }

        // Detect recovery from session metadata (most reliable), or fallback
        // to explicit type/next query params.
        const isRecovery =
          type === "recovery" ||
          next === "/reset-password" ||
          data?.session?.user?.recovery_sent_at != null;

        if (isRecovery) {
          router.replace("/reset-password");
          return;
        }

        if (next && next.startsWith("/") && !next.startsWith("//")) {
          router.replace(next);
          return;
        }

        router.replace("/dashboard");
        return;
      }

      // ── Branch 3: Implicit / hash-based token flow ────────────────────────
      // Old-style Supabase links put tokens in the URL hash (#access_token=…&type=recovery).
      // The server can never read the hash, so we parse it client-side and wait
      // for the SDK to fire an auth event.
      const hashParams = new URLSearchParams(
        typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : ""
      );
      const hashType = hashParams.get("type");

      const session = await waitForSession(supabase, 6000);

      if (session) {
        const isRecovery =
          hashType === "recovery" ||
          type === "recovery" ||
          next === "/reset-password";

        router.replace(
          isRecovery
            ? "/reset-password"
            : next && next.startsWith("/") && !next.startsWith("//")
            ? next
            : "/dashboard"
        );
        return;
      }

      router.replace("/login?error=auth_callback_failed");
    };

    void run();
    // router and searchParams are stable Next.js refs — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <LoadingUI />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingUI />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
