"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ShareError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[share]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl text-foreground">Could not load this article</h1>
      <p className="mt-3 text-sm text-muted-foreground max-w-md">
        Something went wrong while loading the shared link. Please try again.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg bg-foreground text-background font-semibold px-6 py-3 text-sm hover:opacity-90 transition"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm text-foreground hover:bg-secondary/40 transition"
        >
          Go to Hano Insiders
        </Link>
      </div>
    </div>
  );
}
