import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass-through: static assets, root, auth pages, super admin, inactive gate, cron
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/change-password") ||
    pathname.startsWith("/inactive") ||
    pathname.startsWith("/superadmin") ||
    pathname.startsWith("/api/superadmin") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/_next") ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: CookieOptions;
          }>
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({ request });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Public registration page — check masjid active by code
  const registerMatch = pathname.match(/^\/masjids\/([^/]+)/);
  if (registerMatch) {
    const code = registerMatch[1].toUpperCase();
    const { data: masjid } = await supabase
      .from("masjids")
      .select("active")
      .eq("masjid_code", code)
      .maybeSingle();
    if (!masjid || !masjid.active) {
      return NextResponse.redirect(new URL("/inactive", request.url));
    }
    return response;
  }

  // Also block public register API by code
  const apiRegisterMatch = pathname.match(/^\/api\/masjids\/([^/]+)/);
  if (apiRegisterMatch) {
    const code = apiRegisterMatch[1].toUpperCase();
    const { data: masjid } = await supabase
      .from("masjids")
      .select("active")
      .eq("masjid_code", code)
      .maybeSingle();
    if (!masjid || !masjid.active) {
      return NextResponse.json({ error: "Masjid is inactive" }, { status: 403 });
    }
    return response;
  }

  // Auth-gated routes: check session + masjid active
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!user || user.app_metadata?.role !== "masjid_admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const masjidId = user.app_metadata?.masjid_id;
    if (masjidId) {
      const { data: masjid } = await supabase
        .from("masjids")
        .select("active")
        .eq("id", masjidId)
        .maybeSingle();
      if (!masjid?.active)
        return NextResponse.redirect(new URL("/inactive", request.url));
    }
  }

  if (pathname.startsWith("/member") || pathname.startsWith("/api/member")) {
    if (!user || user.app_metadata?.role !== "member") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const masjidId = user.app_metadata?.masjid_id;
    if (masjidId) {
      const { data: masjid } = await supabase
        .from("masjids")
        .select("active")
        .eq("id", masjidId)
        .maybeSingle();
      if (!masjid?.active)
        return NextResponse.redirect(new URL("/inactive", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
