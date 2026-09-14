import CashBookReport from "@/components/CashBookReport";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cash Book — Baitul Jamaat" };

export default function CashBookPage() {
  return <CashBookReport />;
}
