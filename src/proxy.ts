import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public paths — no auth needed
  const publicPaths = ["/login", "/register", "/inactive", "/api/register"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return supabaseResponse;
  }

  // Unauthenticated users → login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = user.app_metadata?.role as string | undefined;
  const masjidId = user.app_metadata?.masjid_id as string | undefined;

  // Super admin routes
  if (pathname.startsWith("/superadmin")) {
    if (role !== "super_admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return supabaseResponse;
  }

  // Masjid admin and member routes — check if masjid is active
  if (pathname.startsWith("/admin") || pathname.startsWith("/member")) {
    if (role !== "masjid_admin" && role !== "member") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Gate: check masjid active status
    if (masjidId) {
      const { data: masjid } = await supabase
        .from("masjids")
        .select("active")
        .eq("id", masjidId)
        .single();

      if (masjid && !masjid.active) {
        return NextResponse.redirect(new URL("/inactive", request.url));
      }
    }

    return supabaseResponse;
  }

  // API routes — enforce same role checks
  if (pathname.startsWith("/api/superadmin") && role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (pathname.startsWith("/api/admin") && role !== "masjid_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Root → redirect by role
  if (pathname === "/") {
    if (role === "super_admin") {
      return NextResponse.redirect(new URL("/superadmin/dashboard", request.url));
    }
    if (role === "masjid_admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (role === "member") {
      return NextResponse.redirect(new URL("/member/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
