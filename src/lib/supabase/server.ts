import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Masjid, Profile, Member } from "@/types/database";

// Re-export typed row types so callers can import from one place
export type { Masjid, Profile, Member };

function makeOptions(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // No-op in Server Components — middleware handles cookie refresh
        }
      },
    },
  };
}

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    makeOptions(cookieStore)
  );
}

export async function createAdminClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    makeOptions(cookieStore)
  );
}
