import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export async function POST(request: Request) {
  // 1. Verify the user is authenticated via the server-side cookie session.
  //    This is always reliable and does not depend on the browser client's
  //    access-token state, which can be expired or de-synced.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate the payload.
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid password" },
      { status: 400 },
    );
  }

  // 3. Use the Admin API (service role) to update the password.
  //    This is the only approach that works reliably when the browser-side
  //    access token is expired, which is the common case for "in-settings"
  //    password changes (the user may have been logged in for hours).
  try {
    const admin = getServiceSupabase();
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: parsed.data.password,
    });

    if (error) {
      console.error("[update-password] Admin updateUserById failed:", error.message);
      return NextResponse.json(
        { error: error.message || "Failed to update password" },
        { status: 400 },
      );
    }

    // 4. Refresh the server-side session so the user stays logged in with
    //    the new credentials without needing to sign out / back in.
    const serverClient = await createClient();
    await serverClient.auth.refreshSession();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[update-password] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
