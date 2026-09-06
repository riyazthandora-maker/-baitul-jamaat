"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Users, LogOut, TrendingUp, Receipt, Users2, DatabaseZap, Menu, X, HelpCircle, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/programs", label: "Programs", icon: TrendingUp },
  { href: "/admin/finance", label: "Finance", icon: Wallet },
  { href: "/admin/receipts", label: "Receipts", icon: Receipt },
  { href: "/admin/families", label: "Families", icon: Users2 },
  { href: "/admin/migration", label: "Migration", icon: DatabaseZap },
  { href: "/guide", label: "Guide", icon: HelpCircle },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav className="bg-brand-green text-white shadow-lg relative z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <span className="font-bold text-lg text-brand-gold flex-shrink-0">
          Baitul Jamaat
        </span>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right side: sign out (desktop) + hamburger (mobile) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSignOut}
            className="hidden md:flex items-center gap-1.5 text-sm hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-brand-green border-t border-white/10 shadow-xl">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active ? "bg-white/20" : "hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <div className="border-t border-white/10 pt-2 mt-2">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
