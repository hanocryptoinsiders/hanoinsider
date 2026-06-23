import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const isDevDashboardBypass =
    process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS !== "false";

  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session — MUST NOT run any user logic between createServerClient and getUser
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Helper to construct a redirect response with synced cookies
  const redirect = (toUrl: string | URL) => {
    const redirectResponse = NextResponse.redirect(toUrl);
    // Copy updated cookies from supabaseResponse to the redirect response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
      });
    });
    return redirectResponse;
  };

  // ── Protect /admin routes ─────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return redirect(url);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return redirect(new URL("/dashboard", request.url));
    }
  }

  // ── Protect /dashboard routes ──────────────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    if (isDevDashboardBypass) {
      return supabaseResponse;
    }

    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return redirect(url);
    }
  }

  // ── Redirect logged-in users away from /login and /register ──────────────
  if ((pathname === "/login" || pathname === "/register") && user) {
    return redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/login",
    "/register",
    "/auth/:path*",
  ],
};
