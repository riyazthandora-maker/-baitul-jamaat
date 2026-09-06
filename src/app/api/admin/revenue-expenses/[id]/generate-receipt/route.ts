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
  let { data: entry, error } = await adminSupabase.rpc(
    "generate_external_revenue_receipt",
    { p_masjid_id: masjidId, p_actor_id: user.id, p_entry_id: id }
  );

  // Support deployments where migration 025 has not been applied yet.
  if (error?.message.includes("generate_external_revenue_receipt")) {
    const { data: existing, error: lookupError } = await adminSupabase
      .from("revenue_expenses")
      .select("*")
      .eq("id", id)
      .eq("masjid_id", masjidId)
      .eq("type", "revenue")
      .eq("entity_type", "contact")
      .is("deleted_at", null)
      .maybeSingle();

    if (lookupError || !existing) {
      return NextResponse.json({ error: "Pending external revenue entry not found" }, { status: 404 });
    }

    if (!existing.receipt_number) {
      const sequence = await adminSupabase.rpc("next_revenue_receipt_number", {
        p_masjid_id: masjidId,
        p_year: Number(String(existing.date).slice(0, 4)),
      });
      if (sequence.error || !sequence.data) {
        return NextResponse.json({ error: sequence.error?.message ?? "Unable to generate receipt" }, { status: 400 });
      }
      const updated = await adminSupabase
        .from("revenue_expenses")
        .update({ receipt_number: sequence.data, is_received: true })
        .eq("id", id)
        .eq("masjid_id", masjidId)
        .is("receipt_number", null)
        .select()
        .maybeSingle();
      entry = updated.data ?? existing;
      error = updated.error;
    } else if (!existing.is_received) {
      const updated = await adminSupabase
        .from("revenue_expenses")
        .update({ is_received: true })
        .eq("id", id)
        .eq("masjid_id", masjidId)
        .select()
        .single();
      entry = updated.data;
      error = updated.error;
    } else {
      entry = existing;
      error = null;
    }
  }

  if (error || !entry) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to generate receipt" },
      { status: 400 }
    );
  }

  return NextResponse.json({ entry });
}
