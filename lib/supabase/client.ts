import { createBrowserClient } from "@supabase/ssr";

/**
 * Returns a Supabase browser client.
 *
 * We intentionally do NOT cache a module-level singleton here.
 * The `@supabase/ssr` `createBrowserClient` implementation already
 * de-duplicates the underlying GoTrue client per (url, anonKey) pair
 * using its own internal singleton, so calling this function repeatedly
 * is safe and cheap — but it avoids the stale-session bug where a cached
 * module reference holds on to an outdated auth state (e.g. after a
 * password-recovery token sets a brand-new session in the same tab).
 */
export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://placeholder.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
