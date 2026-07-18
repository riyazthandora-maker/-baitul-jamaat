"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
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

export async function memberLoginAction(formData: FormData) {
  const memberId = (formData.get("member_id") as string)?.trim().toUpperCase();
  const password = formData.get("password") as string;

  if (!memberId || !password) {
    return { error: "Member ID and password are required." };
  }

  // Admin client bypasses RLS to look up the member by member_number
  const adminSupabase = await createAdminClient();
  const { data: member } = await adminSupabase
    .from("members")
    .select("id, profile_id, status")
    .eq("member_number", memberId)
    .maybeSingle();

  if (!member?.profile_id || member.status !== "active") {
    return { error: "Invalid Member ID or password." };
  }

  // Auth user was created with email = `{member.id}@bj.local` (member row UUID)
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${member.id}@bj.local`,
    password,
  });

  if (error || !data.user) {
    return { error: "Invalid Member ID or password." };
  }

  if (data.user.app_metadata?.force_password_change) {
    redirect("/change-password");
  }

  redirect("/member/dashboard");
}
