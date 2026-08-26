import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCSV, validateRow, generateTemplateCSV } from "@/lib/csv-import";
import type { ValidatedRow } from "@/lib/csv-import";

const MAX_ROWS = 500;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("action") !== "template") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const csv = generateTemplateCSV();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="members_import_template.csv"',
    },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();
  const rawRows = parseCSV(text);

  if (rawRows.length === 0) {
    return NextResponse.json({ error: "CSV file is empty or has no data rows" }, { status: 400 });
  }

  if (rawRows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows. Maximum is ${MAX_ROWS}, found ${rawRows.length}.` },
      { status: 400 }
    );
  }

  // Validate all rows
  const validated: ValidatedRow[] = rawRows.map((row, i) => validateRow(row, i + 2));

  const total = validated.length;
  const valid = validated.filter((r) => r.status === "valid").length;
  const errors = validated.filter((r) => r.status === "error").length;

  return NextResponse.json({ total, valid, errors, duplicates: 0, rows: validated });
}
