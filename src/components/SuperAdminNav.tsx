"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MoonStar, Building2, LayoutDashboard, LogOut, ClipboardList, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const links = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/masjids", label: "Masjids", icon: Building2 },
  { href: "/superadmin/applications", label: "Applications", icon: ClipboardList },
];

export default function SuperAdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="brand-gradient shadow-lg relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <MoonStar className="w-7 h-7 text-brand-gold" />
            <span className="text-white font-bold text-lg">Baitul Jamaat</span>
            <span className="hidden sm:inline text-green-300 text-xs font-medium bg-green-900/40 px-2 py-0.5 rounded-full">
              Super Admin
            </span>
          </div>

          {/* Desktop nav */}
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

          {/* Right: logout (desktop) + hamburger (mobile) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 text-green-100 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="sm:hidden p-2 rounded-lg text-green-100 hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="sm:hidden absolute top-16 left-0 right-0 brand-gradient border-t border-white/10 shadow-xl">
          <div className="px-4 py-3 space-y-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(href)
                    ? "bg-white/20 text-white"
                    : "text-green-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            <div className="border-t border-white/10 pt-2 mt-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-green-100 hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
