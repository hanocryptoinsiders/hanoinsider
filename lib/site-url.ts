/**
 * lib/site-url.ts
 *
 * Returns the canonical site URL for the current environment.
 * Use this for `emailRedirectTo` and any server-side absolute URL construction.
 *
 * Priority:
 *   1. NEXT_PUBLIC_SITE_URL  â€” explicitly set production URL
 *   2. NEXT_PUBLIC_VERCEL_URL â€” automatically injected by Vercel
 *   3. localhost fallback for local development
 *
 * Never ends with a trailing slash.
 */
export function getSiteUrl(): string {
  // Explicitly configured (recommended for production)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  // Vercel auto-injects this during deployments
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL.replace(/\/$/, "")}`;
  }

  // Local development fallback
  return "http://localhost:3000";
}
