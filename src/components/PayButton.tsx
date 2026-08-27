"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Smartphone, QrCode, ChevronDown, ChevronUp } from "lucide-react";
import {
  buildUpiLink,
  buildMemberTransactionNote,
  parsePayAmount,
  MAX_UPI_AMOUNT,
  UPI_QR_SIZE,
  UPI_QR_COLORS,
} from "@/lib/upi";

interface Props {
  upiId: string;
  masjidName: string;
  balance: number;
  memberNumber?: string | null;
  memberName: string;
  initialAmount?: number;
}

export default function PayButton({
  upiId,
  masjidName,
  balance,
  memberNumber,
  memberName,
  initialAmount = 0,
}: Props) {
  const [amountInput, setAmountInput] = useState(
    initialAmount > 0 ? initialAmount.toFixed(2) : ""
  );
  const [showQr, setShowQr] = useState(false);
  const [qrHint, setQrHint] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visListenerRef = useRef<(() => void) | null>(null);

  const payAmount = parsePayAmount(amountInput) ?? 0;
  const amountValid = payAmount > 0;

  const upiLink = useMemo(
    () =>
      buildUpiLink({
        upiId,
        payeeName: masjidName,
        amount: payAmount,
        transactionNote: buildMemberTransactionNote(memberNumber, memberName),
      }),
    [upiId, masjidName, payAmount, memberNumber, memberName]
  );

  // Regenerate the QR whenever the amount changes; cancelled flag guards
  // against an out-of-order result from a previous keystroke.
  useEffect(() => {
    if (!amountValid) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(upiLink, {
          width: UPI_QR_SIZE,
          margin: 2,
          color: UPI_QR_COLORS,
        })
      )
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      });
    return () => {
      cancelled = true;
    };
  }, [upiLink, amountValid]);

  function handlePay() {
    if (!amountValid) return;

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

  const amountNum = Number(amountInput);
  const tooHigh =
    amountInput.trim() !== "" && Number.isFinite(amountNum) && amountNum > MAX_UPI_AMOUNT;
  const inputInvalid = amountInput.trim() !== "" && !amountValid && !tooHigh;

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-700">
          {balance > 0 ? "Pay Outstanding Dues" : "Make an Advance Payment"}
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">
          {balance > 0
            ? `Amount pre-filled ₹${balance.toFixed(2)} — you can change it`
            : "No dues. Pay any amount now; it becomes credit toward future charges."}
        </p>
      </div>

      {/* Amount input */}
      <div>
        <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-brand-green transition-colors overflow-hidden">
          <span className="pl-4 text-lg font-semibold text-gray-500">₹</span>
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            className="w-full px-3 py-3.5 text-lg font-semibold text-gray-800 outline-none"
            aria-label="Payment amount"
          />
        </div>
        {tooHigh ? (
          <p className="text-xs text-red-500 mt-1.5">
            Maximum ₹{MAX_UPI_AMOUNT.toLocaleString("en-IN")} per payment
          </p>
        ) : inputInvalid ? (
          <p className="text-xs text-red-500 mt-1.5">Enter a valid amount</p>
        ) : null}
      </div>

      {/* Quick pay shortcuts (only when there are dues) */}
      {balance > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => setAmountInput(balance.toFixed(2))}
            className="flex-1 border border-brand-green/40 text-brand-green py-2 rounded-lg text-sm font-medium hover:bg-brand-green/5 transition-colors"
          >
            Full Due ₹{balance.toFixed(2)}
          </button>
          <button
            onClick={() => setAmountInput((balance / 2).toFixed(2))}
            className="flex-1 border border-gray-200 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            50%
          </button>
        </div>
      )}

      {/* Primary pay button */}
      <button
        onClick={handlePay}
        disabled={!amountValid}
        className="w-full bg-brand-green text-white py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Smartphone className="w-6 h-6" />
        {amountValid ? `Pay ₹${payAmount.toFixed(2)} via GPay` : "Enter an amount to pay"}
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
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="UPI QR Code" width={200} height={200} className="block" />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-sm text-gray-400">
                  {amountValid ? "Generating QR…" : "Enter an amount to see the QR"}
                </div>
              )}
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">
            Scan with GPay, PhonePe, or any UPI app
          </p>
          <p className="text-xs text-gray-400 font-mono">{upiId}</p>
          {amountValid && (
            <p className="text-xs text-gray-400">
              Amount ₹{payAmount.toFixed(2)} is pre-filled when you scan
            </p>
          )}
        </div>
      )}
    </div>
  );
}
