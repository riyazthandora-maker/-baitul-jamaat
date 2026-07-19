"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LogIn, Users, CheckCircle, CreditCard, FileText, Home,
  BookOpen, Key, ChevronDown, ChevronUp, ArrowLeft,
  Smartphone, QrCode, UserPlus, FolderOpen, BarChart3,
  AlertCircle, Lightbulb, Star, Shield, HelpCircle,
} from "lucide-react";

type Role = "admin" | "member";

interface Step {
  icon: React.ReactNode;
  title: string;
  summary: string;
  steps: string[];
  tip?: string;
  warning?: string;
}

const adminSteps: Step[] = [
  {
    icon: <LogIn className="w-6 h-6" />,
    title: "ലോഗിൻ ചെയ്യൽ",
    summary: "സ്റ്റാഫ്/അഡ്മിൻ ആയി ലോഗിൻ ചെയ്യുക",
    steps: [
      "ആപ്പ് തുറന്ന് 'Staff / Admin' ടാബ് തിരഞ്ഞെടുക്കുക.",
      "നിങ്ങളുടെ ഫോൺ നമ്പർ (10 അക്കം) നൽകുക.",
      "പാസ്‌വേഡ് നൽകി 'Log In' ക്ലിക്ക് ചെയ്യുക.",
      "ആദ്യ ലോഗിനിൽ ഒരു പുതിയ പാസ്‌വേഡ് സജ്ജീകരിക്കാൻ ആവശ്യപ്പെടും.",
    ],
    tip: "പാസ്‌വേഡ് മറന്നാൽ Super Admin-നെ ബന്ധപ്പെടുക.",
  },
  {
    icon: <UserPlus className="w-6 h-6" />,
    title: "അംഗ അപേക്ഷകൾ അംഗീകരിക്കൽ",
    summary: "പുതിയ അംഗങ്ങളെ Approve അല്ലെങ്കിൽ Reject ചെയ്യുക",
    steps: [
      "ഡാഷ്‌ബോർഡിൽ 'Pending Members' കാർഡ് ക്ലിക്ക് ചെയ്യുക അല്ലെങ്കിൽ Members → തിരഞ്ഞെടുക്കുക.",
      "അംഗത്തിന്റെ പേര് ക്ലിക്ക് ചെയ്ത് വിശദാംശങ്ങൾ കാണുക.",
      "ഐഡി രേഖ, ഫോട്ടോ, നൽകിയ വിവരങ്ങൾ ശ്രദ്ധയോടെ പരിശോധിക്കുക.",
      "✅ Approve ക്ലിക്ക് ചെയ്താൽ Member ID ഓട്ടോമാറ്റിക്കലി ഉണ്ടാകും; ക്രെഡൻഷ്യൽ സ്ക്രീനിൽ കാണും.",
      "❌ Reject ക്ലിക്ക് ചെയ്ത് കാരണം നൽകി അയക്കുക.",
    ],
    tip: "Approve ചെയ്ത ശേഷം Member ID, Temp Password സ്ക്രീനിൽ കാണും — ഒറ്റ തവണ മാത്രം! Copy ചെയ്ത് SMS അല്ലെങ്കിൽ WhatsApp-ൽ അയക്കുക.",
    warning: "⚠️ സംശയമുള്ള 'Possible Duplicate' ബാഡ്ജ് ഉള്ള അപേക്ഷകൾ ശ്രദ്ധയോടെ പരിശോധിക്കുക.",
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: "പ്രോഗ്രാമുകൾ ഉണ്ടാക്കൽ",
    summary: "ചാർജ് ചെയ്യുന്ന പദ്ധതികൾ സൃഷ്ടിക്കുക",
    steps: [
      "Programs → 'New Program' ക്ലിക്ക് ചെയ്യുക.",
      "പ്രോഗ്രാം പേര്, തരം (Monthly/Yearly/One-time), തുക നൽകുക.",
      "Save ചെയ്ത ശേഷം 'Enroll Members' ക്ലിക്ക് ചെയ്ത് അംഗങ്ങളെ ചേർക്കുക.",
      "Monthly/Yearly ആണെങ്കിൽ ബില്ലിംഗ് ഓട്ടോമാറ്റിക്കലി നടക്കും (ദൈനംദിന ക്രോൺ ജോബ്).",
    ],
    tip: "ഒരു അംഗം ഒന്നിലധികം Programs-ൽ ഉൾപ്പെടാം.",
  },
  {
    icon: <CreditCard className="w-6 h-6" />,
    title: "പേയ്‌മെന്റ് രേഖപ്പെടുത്തൽ",
    summary: "അംഗം നൽകിയ പണം Ledger-ൽ ചേർക്കുക",
    steps: [
      "Receipts → 'Record Payment' ക്ലിക്ക് ചെയ്യുക.",
      "അംഗം Search ചെയ്ത് തിരഞ്ഞെടുക്കുക — Outstanding Balance കാണും.",
      "തുകയും (ഐച്ഛിക) Notes-ഉം നൽകി 'Save Receipt' ക്ലിക്ക് ചെയ്യുക.",
      "Receipt Number ഓട്ടോ ഉണ്ടാകും; PDF Download/Email ചെയ്യാം.",
    ],
    tip: "Receipt Void ചെയ്യണമെങ്കിൽ Receipts പട്ടികയിൽ ചെന്ന് Void ബട്ടൺ ഉപയോഗിക്കുക. Void ചെയ്ത receipts delete ആകില്ല, record ആയി നിലനിൽക്കും.",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Opening Balance (Data Migration)",
    summary: "കടലാസ് രേഖകളിൽ നിന്ന് Migrate ചെയ്യുക",
    steps: [
      "Members → ഒരു അംഗം തിരഞ്ഞെടുക്കുക → 'Opening Balance' സെക്ഷൻ കാണുക.",
      "മുൻ കാലത്തെ ബാക്കി തുക നൽകി Save ചെയ്യുക.",
      "ഒറ്റയടിക്ക് എല്ലാ അംഗങ്ങൾക്കും ചേർക്കാൻ Migration → Bulk ഉപയോഗിക്കുക.",
    ],
    tip: "Opening Balance 0 നൽകിയാൽ നിലവിലുള്ളത് Remove ആകും.",
  },
  {
    icon: <Key className="w-6 h-6" />,
    title: "അംഗ പാസ്‌വേഡ് Reset ചെയ്യൽ",
    summary: "അംഗം പാസ്‌വേഡ് മറന്നാൽ Reset ചെയ്യുക",
    steps: [
      "Members → അംഗം → 'Member Account' സെക്ഷൻ കണ്ടെത്തുക.",
      "'Reset Member Password' ബട്ടൺ ക്ലിക്ക് ചെയ്യുക.",
      "Confirm ചെയ്ത ശേഷം ഒരു Temporary Password ഉണ്ടാകും.",
      "ആ Password അംഗത്തിന് SMS/WhatsApp-ൽ അയക്കുക.",
      "അംഗം ലോഗിൻ ചെയ്ത ശേഷം പുതിയ Password ഇടേണ്ടി വരും.",
    ],
    tip: "Password ഒരു തവണ മാത്രം Screen-ൽ കാണിക്കും — Copy ചെയ്ത് വെക്കുക!",
  },
  {
    icon: <FolderOpen className="w-6 h-6" />,
    title: "കുടുംബ മാപ്പിംഗ്",
    summary: "അംഗങ്ങളെ കുടുംബ ഗ്രൂപ്പുകളായി തരംതിരിക്കുക",
    steps: [
      "Families → 'New Family' ക്ലിക്ക് ചെയ്യുക.",
      "കുടുംബ പേര് നൽകുക; AI Suggestions ക്ലിക്ക് ചെയ്ത് ഓട്ടോ ഗ്രൂപ്പിംഗ് നോക്കുക.",
      "Add Members ക്ലിക്ക് ചെയ്ത് അംഗങ്ങളെ ചേർക്കുക.",
    ],
    tip: "AI ഓട്ടോ-ഗ്രൂപ്പിംഗ് GEMINI API ഉപയോഗിക്കുന്നു — ഒരു Suggestion മാത്രം; Admin Review ആവശ്യമാണ്.",
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: "Monthly Statement",
    summary: "അംഗ Statement PDF ഉണ്ടാക്കുക / Email ചെയ്യുക",
    steps: [
      "Members → ഒരു അംഗം → Ledger Section → 'Send Statement' ക്ലിക്ക് ചെയ്യുക.",
      "Email ഉള്ള അംഗത്തിന് നേരിട്ട് Email ആക്കാം; PDF Download-ഉം ചെയ്യാം.",
      "എല്ലാ അംഗങ്ങളുടെയും Statement Admin-ന് ഓട്ടോ Email ആകും (മാസം ഒന്ന്, 12:30 AM).",
    ],
  },
];

const memberSteps: Step[] = [
  {
    icon: <UserPlus className="w-6 h-6" />,
    title: "രജിസ്ട്രേഷൻ",
    summary: "ആദ്യമായി അംഗത്വം നേടുക",
    steps: [
      "Admin നൽകിയ Link (m.baitujamaat.app/{masjid-code}) ബ്രൗസറിൽ തുറക്കുക.",
      "പേര്, ഫോൺ, ജനന തീയ്യതി, വിലാസം എന്നിവ ഫോമിൽ പൂരിപ്പിക്കുക.",
      "ഐഡി തെളിവ് (Aadhaar/PAN/Driving Licence) Photo Upload ചെയ്യുക.",
      "Photo (Selfie) Optional ആയി Upload ചെയ്യാം.",
      "'Submit' ക്ലിക്ക് ചെയ്ത് Admin Approval-ന് കാത്തിരിക്കുക.",
    ],
    tip: "Approval കഴിഞ്ഞാൽ Member ID (M-XXX-XXXX), Temp Password SMS/WhatsApp-ൽ ലഭിക്കും.",
    warning: "⚠️ ഒരേ ഫോൺ നമ്പർ ഉപയോഗിച്ച് Register ചെയ്യാൻ ശ്രമിച്ചാൽ Possible Duplicate ആയി Flag ചെയ്യും — Admin Review ചെയ്ത് Approve ചെയ്യും.",
  },
  {
    icon: <LogIn className="w-6 h-6" />,
    title: "ലോഗിൻ ചെയ്യൽ",
    summary: "Member ID ഉപയോഗിച്ച് Login ചെയ്യുക",
    steps: [
      "Login Page-ൽ 'Member' ടാബ് തിരഞ്ഞെടുക്കുക.",
      "Member ID (ഉദാ: M-BJM-0042) ടൈപ്പ് ചെയ്യുക — ഓട്ടോ Capital Letters ആകും.",
      "Admin നൽകിയ Temp Password ഇടുക.",
      "'Log In' ക്ലിക്ക് ചെയ്യുക — ആദ്യം Password Change Screen വരും.",
      "പുതിയ Password (8 characters+) ഇട്ട് Save ചെയ്യുക.",
    ],
    tip: "Member ID Admin-ൽ നിന്ന് ലഭിക്കും. Format: M-{MASJID CODE}-{NUMBER} (ഉദാ: M-BJM-0042).",
  },
  {
    icon: <Home className="w-6 h-6" />,
    title: "ഡാഷ്‌ബോർഡ്",
    summary: "നിങ്ങളുടെ Account ഓവർവ്യൂ കാണുക",
    steps: [
      "Login ചെയ്ത ശേഷം Dashboard ഓട്ടോ തുറക്കും.",
      "Outstanding Balance (ബാക്കി ബാലൻസ്) കൂടുതൽ വ്യക്തമായ Red Color-ൽ കാണും.",
      "Balance ₹0 ആണെങ്കിൽ Green-ൽ 'All payments up to date ✓' കാണിക്കും.",
      "Recent Transactions (കഴിഞ്ഞ 10) ചുവടെ ലിസ്റ്റ് ആകും.",
      "My Details Section-ൽ Member ID, Name, Phone, Masjid, Member Since കാണും.",
    ],
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: "GPay വഴി പേ ചെയ്യൽ",
    summary: "Outstanding Balance GPay-ൽ Pay ചെയ്യുക",
    steps: [
      "Balance > 0 ആണെങ്കിൽ 'Pay ₹XX via GPay' ബട്ടൺ കാണും.",
      "ബട്ടൺ ക്ലിക്ക് ചെയ്താൽ GPay App ഓട്ടോ തുറക്കും — തുക Pre-filled ആകും.",
      "GPay-ൽ Confirm ചെയ്ത് Pay ചെയ്യുക.",
      "GPay ഇൻസ്റ്റോൾ ഇല്ലെങ്കിൽ 'Show QR Code' ക്ലിക്ക് ചെയ്ത് QR Scan ചെയ്യുക.",
    ],
    tip: "PhonePe, Paytm, BHIM — ഏതൊരു UPI App ഉപയോഗിച്ചും QR Scan ചെയ്യാം.",
    warning: "⚠️ Payment ചെയ്ത ശേഷം Admin-നെ അറിയിക്കുക — Balance Update Admin ആണ് ചെയ്യേണ്ടത്.",
  },
  {
    icon: <QrCode className="w-6 h-6" />,
    title: "QR Code ഉപയോഗം",
    summary: "GPay തുറന്നില്ലെങ്കിൽ QR Scan ചെയ്യുക",
    steps: [
      "'Show QR Code' ബട്ടൺ ക്ലിക്ക് ചെയ്യുക.",
      "Phone Camera-ഉം UPI App-ഉം ഉപയോഗിച്ച് QR Scan ചെയ്യുക.",
      "Amount ₹XX ഓട്ടോ Fill ആകും — Confirm ചെയ്ത് Pay ചെയ്യുക.",
    ],
    tip: "QR Code-ൽ ശരിയായ Amount ഇതിനകം Enter ചെയ്തിട്ടുണ്ട്; manually change ചെയ്യേണ്ട.",
  },
  {
    icon: <Key className="w-6 h-6" />,
    title: "പാസ്‌വേഡ് മറന്നാൽ",
    summary: "Admin-നെ ബന്ധപ്പെട്ട് Reset ചെയ്യുക",
    steps: [
      "Login Page-ൽ 'Forgot password? Contact your masjid admin.' കാണും.",
      "Masjid Admin-നെ ബന്ധപ്പെടുക — ഫോൺ / WhatsApp.",
      "Admin Reset ചെയ്ത ശേഷം ഒരു Temp Password നൽകും.",
      "ആ Password ഉപയോഗിച്ച് Login ചെയ്ത് പുതിയ Password ഇടുക.",
    ],
  },
];

function StepCard({ step, index, isOpen, onToggle }: {
  step: Step;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        isOpen
          ? "border-brand-green/40 shadow-md bg-white"
          : "border-gray-100 bg-white hover:border-brand-green/20 hover:shadow-sm"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left"
      >
        {/* Step number + icon badge */}
        <div className={`relative flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
          isOpen ? "bg-brand-green text-white" : "bg-brand-green/10 text-brand-green"
        }`}>
          {step.icon}
          <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
            isOpen ? "bg-amber-400 text-white" : "bg-gray-200 text-gray-600"
          }`}>
            {index + 1}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-800 text-base leading-snug">{step.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{step.summary}</p>
        </div>

        <div className={`flex-shrink-0 transition-colors ${isOpen ? "text-brand-green" : "text-gray-300"}`}>
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-4">
          {/* Divider */}
          <div className="h-px bg-brand-green/10" />

          {/* Steps */}
          <ol className="space-y-3">
            {step.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-green/10 text-brand-green text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">{s}</p>
              </li>
            ))}
          </ol>

          {/* Tip */}
          {step.tip && (
            <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{step.tip}</p>
            </div>
          )}

          {/* Warning */}
          {step.warning && (
            <div className="flex gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{step.warning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GuidePage() {
  const [role, setRole] = useState<Role>("member");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const steps = role === "admin" ? adminSteps : memberSteps;

  function toggle(i: number) {
    setOpenIndex(openIndex === i ? null : i);
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="brand-gradient text-white relative overflow-hidden">
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-2xl mx-auto px-4 py-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">ഉപയോക്തൃ ഗൈഡ്</h1>
          <p className="text-white/70 text-sm">Baitul Jamaat — Member Management System</p>

          {/* Back link */}
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-xs mt-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Login Page-ലേക്ക് തിരിച്ചു പോകുക
          </Link>
        </div>
      </div>

      {/* Role Switcher */}
      <div className="max-w-2xl mx-auto px-4 -mt-5 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-1.5 flex gap-1.5 border border-gray-100">
          <button
            onClick={() => { setRole("member"); setOpenIndex(0); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
              role === "member"
                ? "bg-brand-green text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Users className="w-4 h-4" />
            അംഗം (Member)
          </button>
          <button
            onClick={() => { setRole("admin"); setOpenIndex(0); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
              role === "admin"
                ? "bg-brand-green text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Shield className="w-4 h-4" />
            അഡ്മിൻ (Admin)
          </button>
        </div>
      </div>

      {/* Section label */}
      <div className="max-w-2xl mx-auto px-4 mt-6 mb-3 flex items-center gap-2">
        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          {role === "admin" ? "അഡ്മിൻ ഗൈഡ് — ഘട്ടം ഘട്ടമായി" : "അംഗ ഗൈഡ് — ഘട്ടം ഘട്ടമായി"}
        </p>
      </div>

      {/* Step cards */}
      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-3">
        {steps.map((step, i) => (
          <StepCard
            key={`${role}-${i}`}
            step={step}
            index={i}
            isOpen={openIndex === i}
            onToggle={() => toggle(i)}
          />
        ))}

        {/* Footer note */}
        <div className="flex gap-3 bg-white border border-gray-100 rounded-2xl p-5 mt-2 shadow-sm">
          <CheckCircle className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">സഹായം വേണോ?</p>
            <p className="text-sm text-gray-500">
              {role === "member"
                ? "ഏതെങ്കിലും സംശയം ഉണ്ടെങ്കിൽ നിങ്ങളുടെ Masjid Admin-നെ ബന്ധപ്പെടുക."
                : "Technical പ്രശ്നങ്ങൾക്ക് Super Admin-നെ ബന്ധപ്പെടുക."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
