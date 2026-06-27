import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase client authenticated with the service role key.
 * This client BYPASSES Row Level Security and must ONLY be used in
 * trusted server-side contexts (route handlers, webhooks, server actions).
 * Never import this into client components.
 */
export function getServiceSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase service role env vars");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
