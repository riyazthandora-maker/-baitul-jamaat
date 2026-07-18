import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets — pass through immediately
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2)$/.test(pathname)) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // --- Always-public paths ---
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/change-password") ||
    pathname.startsWith("/inactive") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/public")
  ) {
    return supabaseResponse;
  }

  // --- Public masjid registration routes (check masjid active by code) ---
  const masjidPageMatch = pathname.match(/^\/masjids\/([^/]+)/);
  const masjidApiMatch = pathname.match(/^\/api\/masjids\/([^/]+)/);
  const masjidCodeMatch = masjidPageMatch ?? masjidApiMatch;

  if (masjidCodeMatch) {
    const code = masjidCodeMatch[1].toUpperCase();
    // Use service role to bypass RLS — anon key has no public read policy on masjids
    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
    const { data: masjid } = await serviceSupabase
      .from("masjids")
      .select("active")
      .eq("masjid_code", code)
      .maybeSingle();

    if (!masjid || !masjid.active) {
      if (masjidApiMatch) {
        return NextResponse.json({ error: "Masjid is inactive" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/inactive", request.url));
    }
    return supabaseResponse;
  }

  // --- All remaining routes require auth ---
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user?.app_metadata?.role as string | undefined;
  const masjidId = user?.app_metadata?.masjid_id as string | undefined;

  // Unauthenticated — redirect page requests to login, return 401 for API
  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (pathname !== "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  // Root → redirect by role
  if (pathname === "/") {
    if (role === "super_admin")
      return NextResponse.redirect(new URL("/superadmin/dashboard", request.url));
    if (role === "masjid_admin")
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    if (role === "member")
      return NextResponse.redirect(new URL("/member/dashboard", request.url));
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // --- Super admin routes ---
  if (pathname.startsWith("/superadmin") || pathname.startsWith("/api/superadmin")) {
    if (role !== "super_admin") {
      if (pathname.startsWith("/api/"))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  // Helper: check if this admin/member's masjid is active (service role bypasses RLS)
  async function checkMasjidActive() {
    if (!masjidId) return true;
    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
    const { data } = await serviceSupabase
      .from("masjids")
      .select("active")
      .eq("id", masjidId)
      .maybeSingle();
    return data?.active ?? true;
  }

  // --- Masjid admin routes ---
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (role !== "masjid_admin") {
      if (pathname.startsWith("/api/"))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!(await checkMasjidActive())) {
      if (pathname.startsWith("/api/"))
        return NextResponse.json({ error: "Masjid is inactive" }, { status: 403 });
      return NextResponse.redirect(new URL("/inactive", request.url));
    }
    return supabaseResponse;
  }

  // --- Member routes ---
  if (pathname.startsWith("/member") || pathname.startsWith("/api/member")) {
    if (role !== "member") {
      if (pathname.startsWith("/api/"))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!(await checkMasjidActive())) {
      if (pathname.startsWith("/api/"))
        return NextResponse.json({ error: "Masjid is inactive" }, { status: 403 });
      return NextResponse.redirect(new URL("/inactive", request.url));
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
