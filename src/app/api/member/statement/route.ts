import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMemberStatementPdf } from "@/lib/pdf";
import { loadMemberStatement } from "@/lib/statements";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "member") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const masjidId = user.app_metadata?.masjid_id as string;
  const month = request.nextUrl.searchParams.get("month");

  const statement = await loadMemberStatement(supabase, {
    masjidId,
    profileId: user.id,
    month,
  });

  if (!statement) return new NextResponse("Member not found", { status: 404 });

  const pdfBytes = await generateMemberStatementPdf(statement);
  const filename = `statement-${statement.member.member_number ?? "member"}-${statement.month}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
