"use client";

import { useState } from "react";
import { ToggleLeft, ToggleRight } from "lucide-react";

interface Props {
  masjidId: string;
  active: boolean;
}

export default function ActiveToggle({ masjidId, active }: Props) {
  const [isActive, setIsActive] = useState(active);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/masjids/${masjidId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !isActive }),
      });
      if (res.ok) setIsActive(!isActive);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isActive ? "Deactivate masjid" : "Activate masjid"}
      className={`transition-colors disabled:opacity-50 ${
        isActive ? "text-green-500 hover:text-red-400" : "text-gray-400 hover:text-green-500"
      }`}
    >
      {isActive ? (
        <ToggleRight className="w-7 h-7" />
      ) : (
        <ToggleLeft className="w-7 h-7" />
      )}
    </button>
  );
}
