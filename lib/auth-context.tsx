"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { hasActiveSubscription } from "@/lib/subscription-access";

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
  status?: "active" | "suspended" | "banned";
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_plan?: string | null;
  subscription_current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  premium_source?: "manual" | "stripe" | null;
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isPremium: boolean;
  isLoading: boolean;
  isMockMode: boolean;
  setMockRole: (role: UserRole) => void;
  signOut: () => Promise<void>;
  updateProfile: (data: { full_name?: string; email?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  grantPremium: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Mock profiles for dev/demo only
const makeMockProfiles = (): Record<UserRole, UserProfile> => ({
  guest:   { id: "guest-id",   full_name: "Guest Visitor",       email: null,                    avatar_url: null, role: "guest",   is_premium: false, subscription_status: "inactive", created_at: new Date().toISOString() },
  free:    { id: "free-id",    full_name: "Expired Member",      email: "member@hanoinsiders.com",   avatar_url: null, role: "free",    is_premium: false, subscription_status: "expired",  created_at: new Date().toISOString() },
  premium: { id: "prem-id",    full_name: "Hano Insiders Member",        email: "member@hanoinsiders.com",      avatar_url: null, role: "premium", is_premium: true,  subscription_status: "active",   created_at: new Date().toISOString() },
  admin:   { id: "admin-id",   full_name: "The Hano Insiders Admin",  email: "admin@hanoinsiders.com",    avatar_url: null, role: "admin",   is_premium: true,  subscription_status: "active",   created_at: new Date().toISOString() },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mockProfiles] = useState(makeMockProfiles);
  const [mockRole, setMockRoleState] = useState<UserRole>("free");
  const [isLoading, setIsLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  // Fetch Profile
  // IMPORTANT: accepts the user object directly to avoid stale-state race conditions
  const fetchProfile = useCallback(
    async (authUser: User) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url, role, is_premium, subscription_status, created_at, status, stripe_customer_id, stripe_subscription_id, subscription_plan, subscription_current_period_end, cancel_at_period_end, premium_source")
          .eq("id", authUser.id)
          .single();

        if (error) {
          // Profile row doesn't exist yet use metadata from auth
          const fallback: UserProfile = {
            id: authUser.id,
            full_name:
              authUser.user_metadata?.full_name ||
              authUser.user_metadata?.name ||
              authUser.email?.split("@")[0] ||
              "Hano Insiders Member",
            email: authUser.email || "",
            avatar_url: authUser.user_metadata?.avatar_url || null,
            role: "free",
            is_premium: false,
            subscription_status: "active",
            created_at: new Date().toISOString(),
          };
          setProfile(fallback);
        } else {
          setProfile(data as UserProfile);
        }
      } catch {
        // Network/unexpected error build minimal fallback
        setProfile({
          id: authUser.id,
          full_name: authUser.email?.split("@")[0] || "Hano Insiders Member",
          email: authUser.email || "",
          avatar_url: null,
          role: "free",
          is_premium: false,
          subscription_status: "active",
          created_at: new Date().toISOString(),
        });
      }
    },
    [supabase]
  );

  // Auth Initialization
  useEffect(() => {
    let mounted = true;

    // Use getUser() (server-validated) rather than getSession() (client JWT only)
    const init = async () => {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser();

        if (!mounted) return;

        if (error || !authUser) {
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }

        setUser(authUser);
        await fetchProfile(authUser);
      } catch {
        if (mounted) setIsLoading(false);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user);
          await fetchProfile(session.user); // pass user directly no stale state
          setIsLoading(false);
          // Refresh Next.js server components so layout/headers update immediately
          router.refresh();
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          router.refresh();
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          setUser(session.user);
        } else if (event === "USER_UPDATED" && session?.user) {
          setUser(session.user);
          await fetchProfile(session.user);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, router]);

  // Referral Signup Attribution
  useEffect(() => {
    if (user) {
      const hasRefCookie = typeof document !== "undefined" && document.cookie.includes("hano_ref");
      if (hasRefCookie) {
        fetch("/api/referrals/signup", { method: "POST" })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.attributed) {
              console.log("[Auth] Referral signup attributed successfully");
            }
          })
          .catch((err) => console.error("[Auth] Error attributing referral signup:", err));
      }
    }
  }, [user]);

  // Mock Role Toggle (dev/demo)
  const setMockRole = (role: UserRole) => {
    setIsMockMode(true);
    setMockRoleState(role);
    toast.success(`Viewing as: ${role.toUpperCase()}`);
  };

  // Sign Out
  const signOut = async () => {
    if (isMockMode) {
      setIsMockMode(false);
      setMockRoleState("free");
      toast.success("Exited simulation mode");
      return;
    }

    try {
      // Clear HTTP-only cookies on server first
      await fetch("/api/auth/signout", { method: "POST" });
    } catch (err) {
      console.error("[auth-context] Server signout failed:", err);
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message || "Sign out failed");
      return;
    }
    // State is cleared by the onAuthStateChange SIGNED_OUT handler above
    toast.success("Signed out successfully");
    router.push("/");
  };

  // Update Profile
  const updateProfile = async (data: { full_name?: string; email?: string }) => {
    if (isMockMode) {
      const updated = { ...mockProfiles[mockRole], ...data };
      mockProfiles[mockRole] = updated;
      setProfile({ ...updated });
      toast.success("Profile updated");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to update your profile");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", user.id);

    if (error) {
      toast.error(error.message || "Failed to update profile");
      return;
    }

    setProfile((prev) => (prev ? { ...prev, ...data } : prev));
    toast.success("Profile saved");
  };

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  // Grant Premium (Optimistic)
  // Instantly switches the client-side profile to premium without waiting for
  // a DB re-fetch. Used by the checkout handler after verify-payment succeeds.
  const grantPremium = useCallback(() => {
    setProfile((prev) =>
      prev
        ? { ...prev, is_premium: true, role: "premium" as UserRole, subscription_status: "active" }
        : prev
    );
    // Also sync from DB in the background (fire-and-forget)
    if (user) {
      fetchProfile(user).catch(() => {});
    }
  }, [user, fetchProfile]);

  // Derived State
  let effectiveRole: UserRole = "guest";
  if (isMockMode) {
    effectiveRole = mockRole;
  } else if (profile?.role) {
    effectiveRole = profile.role;
  } else if (user) {
    effectiveRole = "free";
  }

  const effectiveProfile = isMockMode ? mockProfiles[mockRole] : profile;
  const isPremium = isMockMode
    ? mockProfiles[mockRole].is_premium
    : hasActiveSubscription(effectiveProfile);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: effectiveProfile,
        role: effectiveRole,
        isPremium,
        isLoading,
        isMockMode,
        setMockRole,
        signOut,
        updateProfile,
        refreshProfile,
        grantPremium,
      }}
    >
      {children}

      {/* Dev Role Bar only shown in development, never in production */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full border border-border bg-background/95 backdrop-blur-md p-1.5 shadow-2xl text-[10px] print:hidden">
          <span className="px-2 font-display text-muted-foreground tracking-widest uppercase text-[9px]">
            {isMockMode ? "DEMO" : "LIVE"}
          </span>
          {(["guest", "free", "premium", "admin"] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => setMockRole(r)}
              className={`rounded-full px-2.5 py-1 transition font-medium capitalize text-[10px] ${
                effectiveRole === r
                  ? "bg-foreground text-background shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {r}
            </button>
          ))}
          {isMockMode && (
            <button
              onClick={() => { setIsMockMode(false); toast.success("Back to live mode"); }}
              className="ml-1 rounded-full px-2 py-1 text-[9px] text-destructive hover:bg-destructive/10 transition"
            >
              ×
            </button>
          )}
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
