import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FinanceClient from "./FinanceClient";

export const metadata = { title: "Finance — Baitul Jamaat" };

export default async function FinancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "masjid_admin") {
    redirect("/login");
  }

  return <FinanceClient />;
}
