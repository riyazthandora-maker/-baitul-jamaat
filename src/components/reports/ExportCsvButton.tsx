"use client";
import { Download } from "lucide-react";

interface Props {
  rows: string[][];
  filename: string;
  label?: string;
}

export default function ExportCsvButton({ rows, filename, label = "Export CSV" }: Props) {
  function download() {
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button
      onClick={download}
      className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
    >
      <Download className="w-4 h-4" />
      {label}
    </button>
  );
}
