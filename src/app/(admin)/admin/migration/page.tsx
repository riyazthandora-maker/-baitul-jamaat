import { createClient } from "@/lib/supabase/server";
import MigrationForm from "@/components/MigrationForm";

export default async function MigrationPage() {
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("members")
    .select("id, full_name, member_number, phone")
    .eq("status", "active")
    .order("full_name");

  const memberIds = (members ?? []).map((m) => m.id);
  const openingBalanceMap = new Map<string, number>();

  if (memberIds.length > 0) {
    const { data: obEntries } = await supabase
      .from("ledger")
      .select("member_id, amount")
      .in("member_id", memberIds)
      .eq("type", "opening_balance")
      .is("voided_at", null);

    for (const e of obEntries ?? []) {
      openingBalanceMap.set(e.member_id, Number(e.amount));
    }
  }

  const membersWithBalances = (members ?? []).map((m) => ({
    ...m,
    opening_balance: openingBalanceMap.get(m.id) ?? 0,
  }));

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-green">Data Migration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter the balance each member owed before this system was set up.
          This is recorded as a one-time opening balance in their ledger.
          Leave blank or enter 0 to skip a member.
        </p>
      </div>
      <MigrationForm members={membersWithBalances} />
    </div>
  );
}
