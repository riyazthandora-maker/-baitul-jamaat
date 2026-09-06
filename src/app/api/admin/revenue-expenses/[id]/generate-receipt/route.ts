import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const masjidId = user.app_metadata?.masjid_id as string;
  const adminSupabase = await createAdminClient();
  const { data: entry, error } = await adminSupabase.rpc(
    "generate_external_revenue_receipt",
    { p_masjid_id: masjidId, p_actor_id: user.id, p_entry_id: id }
  );

  if (error || !entry) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to generate receipt" },
      { status: 400 }
    );
  }

  return NextResponse.json({ entry });
}
