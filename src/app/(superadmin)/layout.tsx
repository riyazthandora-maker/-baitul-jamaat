import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SuperAdminNav from "@/components/SuperAdminNav";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "super_admin") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
