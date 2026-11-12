import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMemberStatementPdf } from "@/lib/pdf";
import { sendEmail } from "@/lib/email";
import { buildStatementEmailHtml, loadMemberStatement } from "@/lib/statements";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;
  const month = request.nextUrl.searchParams.get("month");

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email is not configured." },
      { status: 503 }
    );
  }

  const statement = await loadMemberStatement(supabase, {
    masjidId,
    memberId: id,
    month,
  });

  if (!statement) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (!statement.member.email) {
    return NextResponse.json(
      { error: "Member has no email address" },
      { status: 400 }
    );
  }

  const pdfBytes = await generateMemberStatementPdf(statement);
  const result = await sendEmail({
    to: statement.member.email,
    subject: `Account Statement — ${statement.monthLabel} — ${statement.masjid.name}`,
    html: buildStatementEmailHtml(statement),
    attachment: {
      filename: `statement-${statement.member.member_number ?? id}-${statement.month}.pdf`,
      content: Buffer.from(pdfBytes),
    },
    masjid_id: masjidId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to send email." },
      { status: 502 }
    );
  }

  return NextResponse.json({ sent: true });
}
