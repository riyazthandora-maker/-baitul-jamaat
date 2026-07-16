"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function MemberSignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={signOut}
      className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
    >
      <LogOut className="w-4 h-4" />
      Sign out
    </button>
  );
}
