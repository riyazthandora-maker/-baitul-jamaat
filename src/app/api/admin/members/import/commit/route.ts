import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { validateRow } from "@/lib/csv-import";
import { generateTempPassword, getAppUrl } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import type { ImportRow } from "@/lib/csv-import";

const MAX_ROWS = 500;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const masjidId = user.app_metadata?.masjid_id as string;

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rows: ImportRow[] = body.rows.map((r: ImportRow) => ({
    ...r,
    opening_balance: r.opening_balance?.trim() || "0",
  }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows (max ${MAX_ROWS})` }, { status: 400 });
  }

  const revalidated = rows.map((row, i) => validateRow(row, i + 1));
  const invalidRows = revalidated.filter((r) => r.status === "error");
  if (invalidRows.length > 0) {
    return NextResponse.json(
      { error: "Some rows failed validation", details: invalidRows },
      { status: 400 }
    );
  }

  const adminSupabase = await createAdminClient();

  const { data: rpcResult, error: rpcError } = await adminSupabase.rpc(
    "bulk_import_members",
    { p_masjid_id: masjidId, p_rows: rows, p_actor_id: user.id }
  );

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  type RpcRow = {
    member_id: string | null;
    member_number: string | null;
    phone: string;
    full_name: string;
    opening_balance_added: boolean;
    success: boolean;
    error: string | null;
  };

  const results = rpcResult as RpcRow[];

  // Build a phone→original-row map to access email from CSV data
  const phoneToRow = new Map(rows.map((r) => [r.phone?.replace(/\D/g, ""), r]));

  // Fetch masjid name once for credential emails
  const { data: masjid } = await adminSupabase
    .from("masjids")
    .select("name")
    .eq("id", masjidId)
    .maybeSingle();
  const masjidName = masjid?.name ?? "Baitul Jamaat";
  const appUrl = getAppUrl(request.nextUrl.origin);

  // Create auth accounts for all successfully imported members
  const successfulRows = results.filter((r) => r.success && r.member_id !== null);

  const authResults = await Promise.allSettled(
    successfulRows.map(async (r) => {
      const tempPassword = generateTempPassword(10);
      const authEmail = `${r.member_id}@bj.local`;

      const { data: authData, error: authErr } =
        await adminSupabase.auth.admin.createUser({
          email: authEmail,
          password: tempPassword,
          email_confirm: true,
          app_metadata: {
            role: "member",
            masjid_id: masjidId,
            force_password_change: true,
          },
          user_metadata: { full_name: r.full_name },
        });

      if (authErr || !authData?.user) {
        throw new Error(authErr?.message ?? "Auth user creation failed");
      }

      const profileId = authData.user.id;

      await adminSupabase.from("profiles").upsert({
        id: profileId,
        masjid_id: masjidId,
        role: "member",
        full_name: r.full_name,
        phone: r.phone,
        force_password_change: true,
      });

      await adminSupabase
        .from("members")
        .update({ profile_id: profileId })
        .eq("id", r.member_id!);

      // Email credentials if the member has an email in the CSV
      const originalRow = phoneToRow.get(r.phone?.replace(/\D/g, ""));
      const memberEmail = originalRow?.email?.trim();
      if (memberEmail) {
        await sendEmail({
          to: memberEmail,
          subject: `Your Membership Account — ${masjidName}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#166534">Welcome to ${masjidName}</h2>
              <p>Assalamu Alaikum <strong>${r.full_name}</strong>,</p>
              <p>Your membership account has been created. Here are your login details:</p>
              <table style="border-collapse:collapse;width:100%;margin:16px 0">
                <tr style="background:#f9fafb">
                  <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Member Number</td>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;font-family:monospace">${r.member_number}</td>
                </tr>
                <tr>
                  <td style="padding:10px 14px;font-weight:600;color:#374151;border:1px solid #e5e7eb">Temporary Password</td>
                  <td style="padding:10px 14px;border:1px solid #e5e7eb;font-family:monospace">${tempPassword}</td>
                </tr>
              </table>
              <p style="color:#92400e;background:#fffbeb;border:1px solid #fde68a;padding:12px;border-radius:8px">
                You will be asked to set a new password on your first login.
              </p>
              ${appUrl ? `<p><a href="${appUrl}/login" style="display:inline-block;background:#166534;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Sign In Now</a></p>` : ""}
            </div>
          `,
          masjid_id: masjidId,
        });
      }

      return {
        member_id: r.member_id!,
        member_number: r.member_number,
        temp_password: tempPassword,
      };
    })
  );

  // Map member_id → login result
  const loginMap = new Map<string, { temp_password: string } | null>();
  authResults.forEach((settled, i) => {
    const memberId = successfulRows[i].member_id!;
    if (settled.status === "fulfilled") {
      loginMap.set(memberId, { temp_password: settled.value.temp_password });
    } else {
      loginMap.set(memberId, null);
    }
  });

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const loginCreated = [...loginMap.values()].filter(Boolean).length;
  const loginFailed = [...loginMap.values()].filter((v) => v === null).length;

  return NextResponse.json({
    succeeded,
    failed,
    login_created: loginCreated,
    login_failed: loginFailed,
    results: results.map((r) => {
      const login = r.member_id ? loginMap.get(r.member_id) : undefined;
      return {
        phone: r.phone,
        full_name: r.full_name,
        member_number: r.member_number ?? undefined,
        error: r.error ?? undefined,
        temp_password: login?.temp_password,
        login_created: r.success ? login !== null && login !== undefined : false,
      };
    }),
  });
}
