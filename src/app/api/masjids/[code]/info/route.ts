import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("masjids")
    .select("name, active")
    .eq("masjid_code", code.toUpperCase())
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ name: data.name, active: data.active });
}
