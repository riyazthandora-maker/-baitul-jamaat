import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, phone, email, qualification, id_type, id_last4, photo_url")
    .eq("profile_id", user.id)
    .maybeSingle();

  return NextResponse.json({ member: member ?? null });
}
