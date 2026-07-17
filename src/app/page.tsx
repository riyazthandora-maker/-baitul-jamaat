import Link from "next/link";
import { MoonStar, Users, TrendingUp, FileText } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen brand-gradient relative overflow-hidden flex flex-col">
      {/* Geometric pattern overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="geo" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <polygon points="40,0 80,20 80,60 40,80 0,60 0,20" fill="none" stroke="white" strokeWidth="0.8"/>
              <polygon points="40,10 70,25 70,55 40,70 10,55 10,25" fill="none" stroke="white" strokeWidth="0.4"/>
              <line x1="40" y1="0" x2="40" y2="80" stroke="white" strokeWidth="0.3"/>
              <line x1="0" y1="40" x2="80" y2="40" stroke="white" strokeWidth="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#geo)"/>
        </svg>
      </div>

      {/* Main content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-white/15 flex items-center justify-center ring-4 ring-white/20">
            <MoonStar className="w-12 h-12 text-brand-gold" />
          </div>
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
              Baitul Jamaat
            </h1>
            <p className="mt-2 text-lg text-white/75">
              Masjid Membership &amp; Donation Management
            </p>
          </div>
        </div>

        {/* Gold divider */}
        <div className="w-16 h-1 rounded-full bg-brand-gold mb-10" />

        {/* Features */}
        <div className="grid sm:grid-cols-3 gap-5 max-w-2xl w-full mb-12">
          {[
            { icon: Users, label: "Member Register", desc: "Register, approve, and manage masjid members with ease" },
            { icon: TrendingUp, label: "Revenue Programs", desc: "Set up recurring donation programs with automatic billing" },
            { icon: FileText, label: "Receipts & Reports", desc: "Generate PDF receipts and monthly statements instantly" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-left border border-white/15">
              <Icon className="w-7 h-7 text-brand-gold mb-3" />
              <p className="font-semibold text-white text-sm">{label}</p>
              <p className="text-white/65 text-xs mt-1 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 bg-brand-gold text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-lg hover:bg-brand-gold-dark transition-colors min-w-[200px]"
        >
          Sign In
        </Link>
        <p className="mt-4 text-white/50 text-xs">
          For masjid administrators and members
        </p>
      </div>

      {/* Footer */}
      <footer className="relative text-center py-5 text-white/40 text-xs border-t border-white/10">
        Baitul Jamaat &mdash; Serving your community &mdash; Built with care for masjids
      </footer>
    </div>
  );
}
