import Link from "next/link";

export default function ShareNotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl text-foreground">Link not available</h1>
      <p className="mt-3 text-sm text-muted-foreground max-w-md">
        This article is not publicly shared or may have been removed.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-lg bg-foreground text-background font-semibold px-6 py-3 text-sm hover:opacity-90 transition"
      >
        Go to Hano Insiders
      </Link>
    </div>
  );
}
