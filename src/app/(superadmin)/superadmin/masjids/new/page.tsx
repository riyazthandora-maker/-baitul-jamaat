import MasjidForm from "@/components/MasjidForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function NewMasjidPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/superadmin/masjids"
          className="text-gray-400 hover:text-brand-green transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold text-brand-green">New Masjid</h1>
      </div>
      <MasjidForm isNew />
    </div>
  );
}
