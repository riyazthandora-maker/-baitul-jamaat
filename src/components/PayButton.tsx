"use client";

import { useState, useRef } from "react";
import { Smartphone, QrCode, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  upiId: string;
  masjidName: string;
  balance: number;
  qrDataUrl: string;
}

export default function PayButton({ upiId, masjidName, balance, qrDataUrl }: Props) {
  const [showQr, setShowQr] = useState(false);
  const [qrHint, setQrHint] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visListenerRef = useRef<(() => void) | null>(null);

  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(masjidName)}&am=${balance.toFixed(2)}&cu=INR&tn=${encodeURIComponent("Outstanding Dues")}`;

  function handlePay() {
    // Open UPI deep link
    window.location.href = upiLink;

    // Clean up any previous listeners
    if (timerRef.current) clearTimeout(timerRef.current);
    if (visListenerRef.current) {
      document.removeEventListener("visibilitychange", visListenerRef.current);
    }

    // If page goes hidden → GPay opened → cancel the fallback timer
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (timerRef.current) clearTimeout(timerRef.current);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        visListenerRef.current = null;
      }
    };
    visListenerRef.current = onVisibilityChange;
    document.addEventListener("visibilitychange", onVisibilityChange);

    // After 2.5s, if page is still visible, GPay probably didn't open — show QR hint
    timerRef.current = setTimeout(() => {
      if (document.visibilityState !== "hidden") {
        setQrHint(true);
        setShowQr(true);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      visListenerRef.current = null;
    }, 2500);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-700">Pay Outstanding Dues</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          ₹{balance.toFixed(2)} will be pre-filled in GPay
        </p>
      </div>

      {/* Primary pay button */}
      <button
        onClick={handlePay}
        className="w-full bg-brand-green text-white py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.98] transition-all"
      >
        <Smartphone className="w-6 h-6" />
        Pay ₹{balance.toFixed(2)} via GPay
      </button>

      {/* Hint text after failed deep link attempt */}
      {qrHint && (
        <p className="text-xs text-center text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          GPay didn&apos;t open? Scan the QR code below with any UPI app.
        </p>
      )}

      {/* QR toggle */}
      <button
        onClick={() => setShowQr((v) => !v)}
        className="w-full flex items-center justify-center gap-2 border border-gray-200 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <QrCode className="w-4 h-4" />
        {showQr ? "Hide QR Code" : "Show QR Code"}
        {showQr ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* QR Code */}
      {showQr && (
        <div className="space-y-3 text-center pt-1">
          <div className="flex justify-center">
            <div className="bg-white border-2 border-brand-green/20 rounded-2xl p-4 shadow-inner">
              <img
                src={qrDataUrl}
                alt="UPI QR Code"
                width={200}
                height={200}
                className="block"
              />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">
            Scan with GPay, PhonePe, or any UPI app
          </p>
          <p className="text-xs text-gray-400 font-mono">{upiId}</p>
          <p className="text-xs text-gray-400">
            Amount ₹{balance.toFixed(2)} is pre-filled when you scan
          </p>
        </div>
      )}
    </div>
  );
}
