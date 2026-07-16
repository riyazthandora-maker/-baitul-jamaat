"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoonStar, Building2, LayoutDashboard, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const links = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/masjids", label: "Masjids", icon: Building2 },
];

export default function SuperAdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="brand-gradient shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <MoonStar className="w-7 h-7 text-brand-gold" />
            <span className="text-white font-bold text-lg">Baitul Jamaat</span>
            <span className="text-green-300 text-xs font-medium bg-green-900/40 px-2 py-0.5 rounded-full ml-1">
              Super Admin
            </span>
          </div>

          <nav className="hidden sm:flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(href)
                    ? "bg-white/20 text-white"
                    : "text-green-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-green-100 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
