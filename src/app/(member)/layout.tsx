import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "member") {
    redirect("/login");
  }

  return <>{children}</>;
}
