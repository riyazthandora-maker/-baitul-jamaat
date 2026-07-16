"use client";

import { Download } from "lucide-react";

export default function QrDownloadButton({
  qrDataUrl,
  masjidCode,
}: {
  qrDataUrl: string;
  masjidCode: string;
}) {
  function download() {
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `registration-qr-${masjidCode}.png`;
    a.click();
  }
  return (
    <button
      onClick={download}
      className="flex items-center gap-1.5 bg-brand-green text-white px-3 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
    >
      <Download className="w-4 h-4" />
      Download QR
    </button>
  );
}
