import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

async function clearServerSession() {
  const supabase = await createClient();

  // Server-side signOut triggers setAll in cookie storage to clear auth cookies
  await supabase.auth.signOut();
}

function clearRecoveryCookie(response: NextResponse) {
  response.cookies.set("hano_password_recovery", "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}

function getSafeNextPath(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function GET(request: NextRequest) {
  try {
    await clearServerSession();

    return clearRecoveryCookie(
      NextResponse.redirect(new URL(getSafeNextPath(request), request.url))
    );
  } catch (error: unknown) {
    console.error("[auth/signout] Server signout error:", error);
    return clearRecoveryCookie(
      NextResponse.redirect(new URL("/login?error=signout_failed", request.url))
    );
  }
}

export async function POST() {
  try {
    await clearServerSession();

    return clearRecoveryCookie(NextResponse.json({ success: true }));
  } catch (error: unknown) {
    console.error("[auth/signout] Server signout error:", error);
    return NextResponse.json(
      { error: "Server signout failed" },
      { status: 500 }
    );
  }
}
