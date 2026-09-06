import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "pending";

  const memberQuery = supabase
    .from("members")
    .select(
      "id, created_at, full_name, phone, email, status, member_number, duplicate_flag, duplicate_reason, dob, gender, qualification, job"
    )
    .eq("status", status)
    .order("created_at", { ascending: false });

  let { data, error } = await memberQuery;

  // Support existing Supabase databases before migration 019 adds job.
  if (error?.message.includes("'job' column")) {
    const legacyResult = await supabase
      .from("members")
      .select(
        "id, created_at, full_name, phone, email, status, member_number, duplicate_flag, duplicate_reason, dob, gender, qualification"
      )
      .eq("status", status)
      .order("created_at", { ascending: false });
    data = (legacyResult.data ?? []).map((member) => ({ ...member, job: null }));
    error = legacyResult.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data ?? [] });
}
