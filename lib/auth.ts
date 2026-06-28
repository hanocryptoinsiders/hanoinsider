/**
 * lib/auth.ts
 *
 * Server-side auth utility functions for role-based access control.
 * All functions run in Server Components / Route Handlers ONLY.
 * They rely on the Supabase server client (cookie-based, validated server-side).
 *
 * Roles (from profiles.role): guest | free | premium | admin
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { hasActiveSubscription } from "@/lib/subscription-access";

// ������ Types ����������������������������������������������������������������������������������������������������������������������������������������

export type UserRole = "guest" | "free" | "premium" | "admin";

export type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_premium: boolean;
  subscription_status: string;
  created_at: string;
  status: "active" | "suspended" | "banned";
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_plan?: string | null;
  subscription_current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  premium_source?: "manual" | "stripe" | null;
};

function isDevDashboardBypassEnabled() {
  return process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS !== "false";
}

export { hasActiveSubscription } from "@/lib/subscription-access";

// ������ Core Helpers ��������������������������������������������������������������������������������������������������������������������������

/**
 * Returns the currently authenticated Supabase user (server-validated via getUser()).
 * Returns null if not logged in.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

/**
 * Returns the profile row for the current user from public.profiles.
 * Returns null if user is not logged in or has no profile row.
 */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, is_premium, subscription_status, created_at, status, stripe_customer_id, stripe_subscription_id, subscription_plan, subscription_current_period_end, cancel_at_period_end, premium_source")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

/**
 * Returns true if the current user's profile role is "admin".
 */
export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.role === "admin";
}

/**
 * Returns true if the current user's profile role is "premium" or "admin",
 * or if is_premium is explicitly set to true.
 */
export async function isPremium(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return hasActiveSubscription(profile);
}

// ������ Route Guards (call from Server Components / layouts) ����������������������������������������

/**
 * requireAuth()
 *
 * Ensures the user is logged in and not suspended or banned.
 * If not authenticated � redirects to /login.
 * If suspended/banned � redirects to /account-suspended.
 * Returns the current user + profile for use in the layout/page.
 */
export async function requireAuth(): Promise<{
  user: User;
  profile: UserProfile | null;
}> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();

  if (profile && (profile.status === "suspended" || profile.status === "banned")) {
    redirect("/account-suspended");
  }

  return { user, profile };
}

/**
 * requireAdmin()
 *
 * Ensures the user is logged in AND has role "admin" AND is not suspended/banned.
 * If not authenticated � redirects to /login.
 * If suspended/banned � redirects to /account-suspended.
 * If authenticated but not admin � redirects to /dashboard.
 * Returns the current user + profile.
 */
export async function requireAdmin(): Promise<{
  user: User;
  profile: UserProfile;
}> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.status === "suspended" || profile.status === "banned") {
    redirect("/account-suspended");
  }

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  return { user, profile };
}

/**
 * requirePremium()
 *
 * Ensures the user is logged in AND has premium or admin access AND is not suspended/banned.
 * If not authenticated � redirects to /login.
 * If suspended/banned � redirects to /account-suspended.
 * If authenticated but not premium � redirects to /pricing.
 * Returns the current user + profile.
 */
export async function requirePremium(): Promise<{
  user: User;
  profile: UserProfile;
}> {
  if (isDevDashboardBypassEnabled()) {
    return {
      user: {
        id: "dev-bypass-user",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User,
      profile: {
        id: "dev-bypass-user",
        full_name: "Dev Preview",
        email: "dev@local.test",
        avatar_url: null,
        role: "admin",
        is_premium: true,
        subscription_status: "active",
        created_at: new Date().toISOString(),
        status: "active",
        premium_source: "manual",
      },
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.status === "suspended" || profile.status === "banned") {
    redirect("/account-suspended");
  }

  if (!hasActiveSubscription(profile)) {
    redirect("/?renew=1");
  }

  return { user, profile };
}
