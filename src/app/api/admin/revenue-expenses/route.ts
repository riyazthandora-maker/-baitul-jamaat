import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  revenueExpenseSchema,
  isWithin60DayWindow,
} from "@/lib/validators/revenue-expense";
import { sendEmail } from "@/lib/email";

// ──────────────────────────────────────────────────────────────────────────
// GET /api/admin/revenue-expenses
// Query params:
//   type         : 'revenue' | 'expense'
//   entity_type  : 'member' | 'contact'
//   entity_id    : UUID
//   status       : 'received' | 'pending' | 'paid' | 'unpaid'
//   date_from    : YYYY-MM-DD
//   date_to      : YYYY-MM-DD
//   amount_min   : number
//   amount_max   : number
//   search       : string  (receipt/voucher number)
//   entity_search: string  (member or contact name/number)
//   page         : number  (1-indexed, default 1)
//   page_size    : number  (default 20, max 100)
// ──────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;
  const adminSupabase = await createAdminClient();

  const sp = request.nextUrl.searchParams;
  const type       = sp.get("type") as "revenue" | "expense" | null;
  const entityType = sp.get("entity_type") as "member" | "contact" | null;
  const entityId   = sp.get("entity_id");
  const status     = sp.get("status");
  const dateFrom   = sp.get("date_from");
  const dateTo     = sp.get("date_to");
  const amountMin  = sp.get("amount_min");
  const amountMax  = sp.get("amount_max");
  const search     = sp.get("search");
  const entitySearch = sp.get("entity_search")?.trim();
  const page       = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const pageSize   = Math.min(100, Math.max(1, parseInt(sp.get("page_size") ?? "20", 10)));
  const from       = (page - 1) * pageSize;
  const to         = from + pageSize - 1;

  let entityFilter: string | null = null;
  if (entitySearch) {
    const [memberMatches, contactMatches] = await Promise.all([
      adminSupabase
        .from("members")
        .select("id")
        .eq("masjid_id", masjidId)
        .or(`full_name.ilike.%${entitySearch}%,member_number.ilike.%${entitySearch}%`)
        .limit(100),
      adminSupabase
        .from("contacts")
        .select("id")
        .eq("masjid_id", masjidId)
        .eq("is_active", true)
        .ilike("name", `%${entitySearch}%`)
        .limit(100),
    ]);
    const memberIds = (memberMatches.data ?? []).map((row) => row.id);
    const contactIds = (contactMatches.data ?? []).map((row) => row.id);
    const clauses: string[] = [];
    if (memberIds.length) clauses.push(`and(entity_type.eq.member,entity_id.in.(${memberIds.join(",")}))`);
    if (contactIds.length) clauses.push(`and(entity_type.eq.contact,entity_id.in.(${contactIds.join(",")}))`);
    entityFilter = clauses.length ? clauses.join(",") : "__no_entity_match__";
  }

  let query = adminSupabase
    .from("revenue_expenses")
    .select("*", { count: "exact" })
    .eq("masjid_id", masjidId)
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (type)       query = query.eq("type", type);
  if (entityType) query = query.eq("entity_type", entityType);
  if (entityId)   query = query.eq("entity_id", entityId);
  if (dateFrom)   query = query.gte("date", dateFrom);
  if (dateTo)     query = query.lte("date", dateTo);
  if (amountMin)  query = query.gte("amount", parseFloat(amountMin));
  if (amountMax)  query = query.lte("amount", parseFloat(amountMax));

  if (status === "received") {
    query = query.eq("is_received", true);
    if (!type) query = query.eq("type", "revenue");
  } else if (status === "pending") {
    query = query.eq("is_received", false);
    if (!type) query = query.eq("type", "revenue");
  } else if (status === "paid") {
    query = query.eq("is_paid", true);
    if (!type) query = query.eq("type", "expense");
  } else if (status === "unpaid") {
    query = query.eq("is_paid", false);
    if (!type) query = query.eq("type", "expense");
  }

  if (search) {
    query = query.or(
      `receipt_number.ilike.%${search}%,voucher_number.ilike.%${search}%`
    );
  }
  if (entityFilter === "__no_entity_match__") {
    return NextResponse.json({ entries: [], total: 0, page, page_size: pageSize });
  }
  if (entityFilter) query = query.or(entityFilter);

  const { data: entries, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich entries with entity names via batched lookups
  const memberIds  = (entries ?? []).filter(e => e.entity_type === "member").map(e => e.entity_id);
  const contactIds = (entries ?? []).filter(e => e.entity_type === "contact").map(e => e.entity_id);

  const [membersRes, contactsRes] = await Promise.all([
    memberIds.length
      ? adminSupabase.from("members").select("id, full_name, member_number, email").in("id", memberIds)
      : { data: [] },
    contactIds.length
      ? adminSupabase.from("contacts").select("id, name, email").in("id", contactIds)
      : { data: [] },
  ]);

  const memberMap  = Object.fromEntries((membersRes.data ?? []).map(m => [m.id, m]));
  const contactMap = Object.fromEntries((contactsRes.data ?? []).map(c => [c.id, c]));

  const enriched = (entries ?? []).map(e => {
    if (e.entity_type === "member") {
      const m = memberMap[e.entity_id];
      return { ...e, entity_name: m?.full_name ?? "Unknown", entity_member_number: m?.member_number ?? null, entity_email: m?.email ?? null };
    }
    const c = contactMap[e.entity_id];
    return { ...e, entity_name: c?.name ?? "Unknown", entity_member_number: null, entity_email: c?.email ?? null };
  });

  return NextResponse.json({
    entries: enriched,
    total: count ?? 0,
    page,
    page_size: pageSize,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// POST /api/admin/revenue-expenses
// ──────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const masjidId = user.app_metadata?.masjid_id as string;

  const body = await request.json();
  const parsed = revenueExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Server-side 60-day window check
  if (!isWithin60DayWindow(parsed.data.date)) {
    return NextResponse.json(
      { error: "Date must be within 30 days before or after today" },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const adminSupabase = await createAdminClient();
  const { data: entry, error: insertErr } = await adminSupabase.rpc(
    "create_revenue_expense",
    {
      p_masjid_id: masjidId,
      p_actor_id: user.id,
      p_type: d.type,
      p_date: d.date,
      p_entity_type: d.entity_type,
      p_entity_id: d.entity_id,
      p_amount: d.amount,
      p_remarks: d.remarks ?? null,
      p_is_received: d.type === "revenue" ? d.is_received : false,
      p_is_paid: d.type === "expense" ? d.is_paid : false,
    }
  );

  if (insertErr || !entry) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Failed to save entry" },
      { status: 500 }
    );
  }

  // Email notification (best-effort; non-blocking)
  void sendReNotification(adminSupabase, masjidId, entry, d.entity_type, d.entity_id).catch(
    err => console.error("[RE email]", err)
  );

  return NextResponse.json({ entry }, { status: 201 });
}

// ──────────────────────────────────────────────────────────────────────────
// Shared email helper — also used by the resend route
// ──────────────────────────────────────────────────────────────────────────
export async function sendReNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminSupabase: any,
  masjidId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entry: any,
  entityType: string,
  entityId: string
) {
  // Skip if no receipt/voucher — nothing settled yet
  if (!entry.receipt_number && !entry.voucher_number) return;

  // Resolve entity email and name
  let email: string | null = null;
  let name = "Valued Member";

  if (entityType === "member") {
    const { data } = await adminSupabase
      .from("members")
      .select("full_name, email")
      .eq("id", entityId)
      .maybeSingle();
    email = data?.email ?? null;
    name = data?.full_name ?? name;
  } else {
    const { data } = await adminSupabase
      .from("contacts")
      .select("name, email")
      .eq("id", entityId)
      .maybeSingle();
    email = data?.email ?? null;
    name = data?.name ?? name;
  }

  if (!email) return;

  const { data: masjid } = await adminSupabase
    .from("masjids")
    .select("name")
    .eq("id", masjidId)
    .maybeSingle();
  const masjidName = masjid?.name ?? "Baitul Jamaat";

  if (entry.type === "revenue" && entry.receipt_number) {
    await sendEmail({
      to: email,
      subject: `Payment receipt — ${entry.receipt_number}`,
      html: `<p>Dear ${name},</p>
<p>Your payment of <strong>₹${entry.amount}</strong> has been received and recorded.</p>
<p>Receipt number: <strong>${entry.receipt_number}</strong></p>
${entry.remarks ? `<p>Remarks: ${entry.remarks}</p>` : ""}
<p>Thank you,<br/>${masjidName}</p>`,
      masjid_id: masjidId,
    });
  } else if (entry.type === "expense" && entry.voucher_number) {
    await sendEmail({
      to: email,
      subject: `Payment voucher — ${entry.voucher_number}`,
      html: `<p>Dear ${name},</p>
<p>A payment of <strong>₹${entry.amount}</strong> has been processed for you.</p>
<p>Voucher number: <strong>${entry.voucher_number}</strong></p>
${entry.remarks ? `<p>Remarks: ${entry.remarks}</p>` : ""}
<p>Regards,<br/>${masjidName}</p>`,
      masjid_id: masjidId,
    });
  }
}
