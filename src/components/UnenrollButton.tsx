"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserMinus, Loader2 } from "lucide-react";

export default function UnenrollButton({
  programId,
  memberId,
  memberName,
}: {
  programId: string;
  memberId: string;
  memberName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function unenroll() {
    if (!confirm(`Remove ${memberName} from this program?`)) return;
    setLoading(true);
    await fetch(`/api/admin/programs/${programId}/enroll`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: memberId }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={unenroll}
      disabled={loading}
      title="Remove from program"
      className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
    </button>
  );
}
