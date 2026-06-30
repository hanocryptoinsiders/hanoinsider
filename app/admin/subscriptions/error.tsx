"use client";

import { useEffect } from "react";

export default function AdminSubscriptionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin/subscriptions] page error:", error);
  }, [error]);

  return (
    <div className="panel p-6">
      <p className="text-sm font-semibold text-destructive">Could not load subscriptions</p>
      <p className="mt-2 text-sm text-muted-foreground">
        This is usually caused by a missing <code className="text-foreground">SUPABASE_SERVICE_ROLE_KEY</code> on
        your host, or a database migration that has not been applied yet.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
      >
        Reload
      </button>
    </div>
  );
}
