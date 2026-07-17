import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestFamilyGroupings } from "@/lib/gemini";
import { z } from "zod";

const SuggestSchema = z.object({
  member_ids: z.array(z.string().uuid()).min(2).max(20),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = SuggestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: members, error } = await supabase
    .from("members")
    .select("id, full_name, dob, gender, address")
    .in("id", parsed.data.member_ids)
    .eq("status", "active");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Maintain original order from member_ids
  const ordered = parsed.data.member_ids.map((id) => members?.find((m) => m.id === id)).filter(Boolean) as typeof members;

  const suggestions = await suggestFamilyGroupings(ordered ?? []);
  return NextResponse.json({ suggestions, members: ordered });
}
