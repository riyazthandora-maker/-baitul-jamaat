"use client";

import { useState } from "react";
import { Copy, Check, AlertTriangle, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Credentials {
  phone: string;
  password: string;
  masjidName: string;
}

interface Props {
  credentials: Credentials;
  onDone?: () => void;
}

export default function CredentialsModal({ credentials, onDone }: Props) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const router = useRouter();

  function copyText(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  }

  function copyAll() {
    const text = `Baitul Jamaat – Admin Credentials\nMasjid: ${credentials.masjidName}\nPhone: ${credentials.phone}\nPassword: ${credentials.password}\n\nPlease change your password on first login.`;
    copyText(text, () => {});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
        {/* Warning banner */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>Shown once only.</strong> Copy these credentials and share
            them securely. They will not be shown again.
          </p>
        </div>

        <h2 className="text-xl font-bold text-brand-green">
          Admin Credentials — {credentials.masjidName}
        </h2>

        {/* Phone */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Phone / Username
          </label>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg border px-4 py-3">
            <span className="font-mono text-base flex-1 select-all">
              {credentials.phone}
            </span>
            <button
              onClick={() => copyText(credentials.phone, setCopiedPhone)}
              className="text-brand-green hover:text-brand-green-dark flex-shrink-0 min-h-0"
            >
              {copiedPhone ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Temporary Password
          </label>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg border px-4 py-3">
            <span className="font-mono text-base flex-1 select-all tracking-wider">
              {credentials.password}
            </span>
            <button
              onClick={() => copyText(credentials.password, setCopiedPassword)}
              className="text-brand-green hover:text-brand-green-dark flex-shrink-0 min-h-0"
            >
              {copiedPassword ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={copyAll}
            className="flex-1 bg-brand-green/10 text-brand-green rounded-lg py-3 text-sm font-medium hover:bg-brand-green/20 transition-colors flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy All
          </button>
          <button
            onClick={() => onDone ? onDone() : router.push("/superadmin/masjids")}
            className="flex-1 bg-brand-green text-white rounded-lg py-3 text-sm font-medium hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
