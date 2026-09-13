"use client";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export default function YearFilter({ current }: { current: number }) {
  const [year, setYear] = useState(current);
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Year</label>
        <input
          type="number"
          min={2000}
          max={2100}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-brand-green"
        />
      </div>
      <button
        onClick={() => router.push(`${pathname}?year=${year}`)}
        className="flex items-center gap-2 bg-brand-green text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Search className="w-4 h-4" /> Apply
      </button>
    </div>
  );
}
