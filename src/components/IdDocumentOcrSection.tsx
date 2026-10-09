"use client";

import { useState, useRef } from "react";
import { ScanLine, Upload, X, Loader2, CheckCircle2 } from "lucide-react";

export interface OcrResult {
  name: string | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
}

interface Props {
  onFill: (data: OcrResult) => void;
}

export default function IdDocumentOcrSection({ onFill }: Props) {
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filled, setFilled] = useState(false);

  const clearFront = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFrontFile(null);
    setFilled(false);
    setError(null);
    if (frontRef.current) frontRef.current.value = "";
  };

  const clearBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBackFile(null);
    if (backRef.current) backRef.current.value = "";
  };

  const handleExtract = async () => {
    if (!frontFile) return;
    setLoading(true);
    setError(null);
    setFilled(false);

    const fd = new FormData();
    fd.append("front", frontFile);
    if (backFile) fd.append("back", backFile);

    try {
      const res = await fetch("/api/profile/ocr", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || !data.ocr) {
        setError(data.error ?? "Could not extract information. Please fill manually.");
      } else {
        onFill(data.ocr as OcrResult);
        setFilled(true);
      }
    } catch {
      setError("Network error. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="border border-dashed border-brand-green/40 rounded-xl p-4 bg-brand-green/5 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-brand-green">
        <ScanLine className="w-4 h-4" />
        Auto-fill from ID Document
        <span className="ml-auto text-xs font-normal text-gray-400">Optional</span>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        Upload your ID card (Aadhaar, PAN, Passport, etc.) to automatically fill in your details.
        The document is <strong>not stored</strong> — only the extracted text is used.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {/* Front side */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Front Side *</p>
          <div
            role="button"
            tabIndex={0}
            className="border border-gray-200 rounded-lg p-2.5 flex items-center gap-2 cursor-pointer hover:bg-white transition-colors min-h-[42px]"
            onClick={() => frontRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && frontRef.current?.click()}
          >
            {frontFile ? (
              <>
                <span className="text-xs text-gray-700 flex-1 truncate">{frontFile.name}</span>
                <button type="button" onClick={clearFront} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-400">Choose file</span>
              </>
            )}
          </div>
          <input
            ref={frontRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setFrontFile(f); setFilled(false); setError(null); }
            }}
          />
        </div>

        {/* Back side */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Back Side (optional)</p>
          <div
            role="button"
            tabIndex={0}
            className="border border-gray-200 rounded-lg p-2.5 flex items-center gap-2 cursor-pointer hover:bg-white transition-colors min-h-[42px]"
            onClick={() => backRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && backRef.current?.click()}
          >
            {backFile ? (
              <>
                <span className="text-xs text-gray-700 flex-1 truncate">{backFile.name}</span>
                <button type="button" onClick={clearBack} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-400">Choose file</span>
              </>
            )}
          </div>
          <input
            ref={backRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setBackFile(f); }}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!frontFile || loading}
        onClick={handleExtract}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-green text-white text-sm font-medium hover:bg-green-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ScanLine className="w-4 h-4" />
        )}
        {loading ? "Extracting…" : "Extract & Fill"}
      </button>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      {filled && (
        <p className="flex items-center gap-1.5 text-xs text-brand-green font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Fields filled — please verify and correct if needed.
        </p>
      )}
    </div>
  );
}
