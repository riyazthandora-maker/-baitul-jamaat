import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FinanceClient from "./FinanceClient";

export const metadata = { title: "Finance — Baitul Jamaat" };

export default async function FinancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "masjid_admin") {
    redirect("/login");
  }

  const masjidId = user.app_metadata?.masjid_id as string;
  const adminSupabase = await createAdminClient();

  const { data: contacts } = await adminSupabase
    .from("contacts")
    .select("id, name, email, phone")
    .eq("masjid_id", masjidId)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(500);

  return <FinanceClient initialContacts={contacts ?? []} />;
}
