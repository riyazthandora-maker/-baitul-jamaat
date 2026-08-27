export const MAX_UPI_AMOUNT = 100_000;
export const UPI_QR_SIZE = 280;
export const UPI_QR_COLORS = { dark: "#1a6b3c", light: "#ffffff" };

export interface BuildUpiLinkParams {
  upiId: string;
  payeeName: string;
  amount: number;
  transactionNote: string;
}

export function buildUpiLink({ upiId, payeeName, amount, transactionNote }: BuildUpiLinkParams): string {
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
}

export function buildMemberTransactionNote(
  memberNumber?: string | null,
  fullName?: string | null
): string {
  return `Payment ${[memberNumber ?? "MEMBER", fullName].filter(Boolean).join(" ")}`.trim();
}

export function parsePayAmount(input: string): number | null {
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n > MAX_UPI_AMOUNT) return null;
  return Math.round(n * 100) / 100;
}
