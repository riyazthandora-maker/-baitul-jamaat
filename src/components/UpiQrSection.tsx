"use client";

import { useState } from "react";
import { QrCode, X } from "lucide-react";

export default function UpiQrSection({
  qrDataUrl,
  masjidName,
  upiId,
}: {
  qrDataUrl: string;
  masjidName: string;
  upiId: string;
}) {
  const [showQr, setShowQr] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
      <h2 className="font-semibold text-gray-700">Make a Payment</h2>
      <p className="text-sm text-gray-500">
        Use Google Pay or any UPI app to pay outstanding dues
      </p>

      {showQr ? (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="bg-white border-2 border-brand-green/20 rounded-xl p-3">
              <img
                src={qrDataUrl}
                alt="UPI QR Code"
                width={220}
                height={220}
                className="block"
              />
            </div>
          </div>
          <p className="text-center text-xs text-gray-400">
            Scan with Google Pay, PhonePe, or any UPI app
          </p>
          <p className="text-center text-xs text-gray-400 font-mono">
            {upiId}
          </p>
          <button
            onClick={() => setShowQr(false)}
            className="w-full flex items-center justify-center gap-2 border border-gray-300 py-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowQr(true)}
          className="w-full bg-brand-green text-white py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
        >
          <QrCode className="w-6 h-6" />
          Pay via UPI / GPay
        </button>
      )}
    </div>
  );
}
