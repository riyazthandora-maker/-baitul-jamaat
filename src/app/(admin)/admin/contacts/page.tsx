import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ContactsClient from "./ContactsClient";

export default async function ContactsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "masjid_admin") {
    redirect("/login");
  }
  return <ContactsClient />;
}
