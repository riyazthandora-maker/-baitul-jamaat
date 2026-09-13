"use client";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

interface Props {
  from: string;
  to: string;
}

export default function DateRangeFilter({ from, to }: Props) {
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">From</label>
        <input type="date" value={f} onChange={(e) => setF(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">To</label>
        <input type="date" value={t} onChange={(e) => setT(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
      </div>
      <button
        onClick={() => router.push(`${pathname}?from=${f}&to=${t}`)}
        className="flex items-center gap-2 bg-brand-green text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Search className="w-4 h-4" /> Apply
      </button>
    </div>
  );
}
