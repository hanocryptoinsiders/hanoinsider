"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const run = async () => {
      const supabase = createClient();

      const error = searchParams.get("error");
      if (error) {
        router.replace("/login?error=oauth_failed");
        return;
      }

      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const next = searchParams.get("next");

      if (tokenHash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as EmailOtpType,
        });

        if (verifyError) {
          router.replace("/login?error=link_expired");
          return;
        }

        router.replace(type === "recovery" ? "/reset-password" : "/dashboard?verified=1");
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          router.replace("/login?error=auth_callback_failed");
          return;
        }

        let destination = "/dashboard";
        if (next && next.startsWith("/") && !next.startsWith("//")) {
          destination = next;
        } else if (type === "recovery") {
          destination = "/reset-password";
        }

        router.replace(destination);
        return;
      }

      // Implicit flow: tokens arrive in the URL hash (#access_token=...&type=recovery).
      // Server route handlers cannot read the hash, so this must run client-side.
      const hashParams = new URLSearchParams(
        typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : ""
      );
      const hashType = hashParams.get("type");

      const session = await new Promise<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>((resolve) => {
        let settled = false;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
          if (
            !settled &&
            nextSession &&
            (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "PASSWORD_RECOVERY")
          ) {
            settled = true;
            subscription.unsubscribe();
            resolve(nextSession);
          }
        });

        void supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
          if (!settled && existingSession) {
            settled = true;
            subscription.unsubscribe();
            resolve(existingSession);
          }
        });

        window.setTimeout(() => {
          if (!settled) {
            settled = true;
            subscription.unsubscribe();
            resolve(null);
          }
        }, 3000);
      });

      if (session) {
        const isRecovery =
          hashType === "recovery" ||
          type === "recovery" ||
          next === "/reset-password";

        router.replace(isRecovery ? "/reset-password" : next && next.startsWith("/") ? next : "/dashboard");
        return;
      }

      router.replace("/login?error=auth_callback_failed");
    };

    void run();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-noise flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Completing sign in…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-noise flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
