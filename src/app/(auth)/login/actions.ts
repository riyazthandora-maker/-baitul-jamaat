"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const phone = (formData.get("phone") as string)?.trim();
  const password = formData.get("password") as string;

  if (!phone || !password) {
    return { error: "Phone number and password are required." };
  }

  const supabase = await createClient();

  // Supabase Auth uses email field — we store phone as the "email" identifier
  // Format: phone@bj.local
  const emailAlias = `${phone.replace(/\s/g, "")}@bj.local`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailAlias,
    password,
  });

  if (error || !data.user) {
    return { error: "Invalid phone number or password." };
  }

  const role = data.user.app_metadata?.role;
  const forceChange = data.user.app_metadata?.force_password_change;

  if (forceChange) {
    redirect("/change-password");
  }

  if (role === "super_admin") redirect("/superadmin/dashboard");
  if (role === "masjid_admin") redirect("/admin/dashboard");
  if (role === "member") redirect("/member/dashboard");

  redirect("/login");
}
