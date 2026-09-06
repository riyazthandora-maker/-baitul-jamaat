import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { sendReNotification } from "@/app/api/admin/revenue-expenses/route";

// POST /api/admin/revenue-expenses/[id]/resend
// Re-queues the email receipt or voucher for this entry.
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

  const { data: entry } = await adminSupabase
    .from("revenue_expenses")
    .select("*")
    .eq("id", id)
    .eq("masjid_id", masjidId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  if (!entry.receipt_number && !entry.voucher_number) {
    return NextResponse.json(
      { error: "No receipt or voucher to resend — entry is not yet settled" },
      { status: 422 }
    );
  }

  try {
    await sendReNotification(adminSupabase, masjidId, entry, entry.entity_type, entry.entity_id);
  } catch {
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
