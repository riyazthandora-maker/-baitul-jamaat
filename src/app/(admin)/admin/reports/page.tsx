import Link from "next/link";
import {
  BookOpen, TrendingUp, AlertCircle, Wallet, Tag, Users,
  Clock, Cake, BarChart3, ClipboardList, ArrowDownLeft,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reports — Baitul Jamaat" };

interface ReportCard {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FINANCE: ReportCard[] = [
  {
    href: "/admin/reports/cashbook",
    icon: <BookOpen className="w-5 h-5" />,
    title: "Cash Book",
    description: "Every cash movement with running balance from day one.",
  },
  {
    href: "/admin/reports/pnl",
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Monthly P&L",
    description: "Revenue vs expense month-by-month for any year.",
  },
  {
    href: "/admin/reports/dues",
    icon: <AlertCircle className="w-5 h-5" />,
    title: "Outstanding Dues",
    description: "Members who owe money — sorted by largest balance.",
  },
  {
    href: "/admin/reports/collections",
    icon: <Wallet className="w-5 h-5" />,
    title: "Collections",
    description: "All money received, broken down by source.",
  },
  {
    href: "/admin/reports/service-fees",
    icon: <Tag className="w-5 h-5" />,
    title: "Service Fees",
    description: "Nikkah, house warming, and other fee codes — usage and revenue.",
  },
  {
    href: "/admin/reports/expenses",
    icon: <ArrowDownLeft className="w-5 h-5" />,
    title: "Expenses by Contact",
    description: "Total disbursed to each external vendor or payee.",
  },
  {
    href: "/admin/reports/programs",
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Revenue by Program",
    description: "Enrollment counts and total charges per subscription program.",
  },
];

const MEMBERS: ReportCard[] = [
  {
    href: "/admin/reports/members",
    icon: <Users className="w-5 h-5" />,
    title: "Member Directory",
    description: "Full list of active members — exportable to CSV.",
  },
  {
    href: "/admin/reports/pending",
    icon: <Clock className="w-5 h-5" />,
    title: "Pending Approvals",
    description: "Registrations awaiting admin review, oldest first.",
  },
  {
    href: "/admin/reports/birthdays",
    icon: <Cake className="w-5 h-5" />,
    title: "Birthday Report",
    description: "Members with birthdays in any given month.",
  },
  {
    href: "/admin/reports/enrollments",
    icon: <ClipboardList className="w-5 h-5" />,
    title: "Enrollment Report",
    description: "Who is enrolled in each program and how much they pay.",
  },
];

function Section({ title, cards }: { title: string; cards: ReportCard[] }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group bg-white rounded-xl shadow-sm p-5 flex gap-4 hover:shadow-md hover:border-brand-green border border-transparent transition-all"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-green/10 text-brand-green flex items-center justify-center group-hover:bg-brand-green group-hover:text-white transition-colors">
              {c.icon}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 text-sm leading-tight">{c.title}</p>
              <p className="text-xs text-gray-400 mt-1 leading-snug">{c.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ReportsHubPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="brand-gradient text-white py-5 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-bold">Reports</h1>
          <p className="text-white/70 text-sm mt-0.5">Financial and membership analytics</p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        <Section title="Finance" cards={FINANCE} />
        <Section title="Members" cards={MEMBERS} />
      </div>
    </div>
  );
}
