import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Server-side signOut triggers setAll in cookie storage to clear auth cookies
    await supabase.auth.signOut();

    const response = NextResponse.json({ success: true });
    response.cookies.set("hano_password_recovery", "", {
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error: unknown) {
    console.error("[auth/signout] Server signout error:", error);
    return NextResponse.json(
      { error: "Server signout failed" },
      { status: 500 }
    );
  }
}
