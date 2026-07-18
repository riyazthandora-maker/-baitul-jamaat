import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const GREEN = rgb(0.102, 0.42, 0.235); // #1a6b3c
const GOLD = rgb(0.788, 0.635, 0.153); // #c9a227
const GRAY = rgb(0.4, 0.4, 0.4);
const BLACK = rgb(0, 0, 0);

function fmt(amount: number) {
  return `Rs. ${Number(amount).toFixed(2)}`;
}

function drawHRule(
  page: ReturnType<PDFDocument["addPage"]>,
  y: number,
  width: number,
  color = GRAY
) {
  page.drawLine({
    start: { x: 40, y },
    end: { x: width - 40, y },
    thickness: 0.5,
    color,
  });
}

export async function generateReceiptPdf(receipt: {
  receipt_number: string;
  created_at: string;
  amount: number;
  notes: string | null;
  title?: string;
  payee: { name: string; identifier: string | null; phone: string | null };
  masjid: { name: string; address: string; phone: string };
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 420]); // A5 landscape-ish
  const { width, height } = page.getSize();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);

  let y = height - 40;

  // Header band
  page.drawRectangle({ x: 0, y: y - 10, width, height: 54, color: GREEN });
  page.drawText(receipt.title ?? "PAYMENT RECEIPT", {
    x: 40,
    y: y + 22,
    size: 18,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(receipt.masjid.name, {
    x: 40,
    y: y + 4,
    size: 10,
    font: regular,
    color: GOLD,
  });
  page.drawText(receipt.receipt_number, {
    x: width - 180,
    y: y + 22,
    size: 12,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(new Date(receipt.created_at).toLocaleDateString("en-IN"), {
    x: width - 180,
    y: y + 4,
    size: 10,
    font: regular,
    color: GOLD,
  });

  y -= 70;

  // Two-column info
  const col2 = width / 2 + 20;

  page.drawText("RECEIVED FROM", { x: 40, y, size: 8, font: bold, color: GRAY });
  page.drawText("MASJID", { x: col2, y, size: 8, font: bold, color: GRAY });
  y -= 14;
  page.drawText(receipt.payee.name, { x: 40, y, size: 11, font: bold, color: BLACK });
  page.drawText(receipt.masjid.name, { x: col2, y, size: 11, font: bold, color: BLACK });
  y -= 14;
  if (receipt.payee.identifier) {
    page.drawText(receipt.payee.identifier, { x: 40, y, size: 9, font: regular, color: GRAY });
  }
  page.drawText(receipt.masjid.address, { x: col2, y, size: 9, font: regular, color: GRAY });
  y -= 12;
  if (receipt.payee.phone) {
    page.drawText(`Ph: ${receipt.payee.phone}`, { x: 40, y, size: 9, font: regular, color: GRAY });
  }
  page.drawText(`Ph: ${receipt.masjid.phone}`, { x: col2, y, size: 9, font: regular, color: GRAY });

  y -= 24;
  drawHRule(page, y, width);

  // Amount row
  y -= 28;
  page.drawRectangle({ x: 38, y: y - 12, width: width - 76, height: 40, color: rgb(0.97, 0.97, 0.97) });
  page.drawText("AMOUNT RECEIVED", { x: 50, y: y + 8, size: 9, font: bold, color: GRAY });
  page.drawText(fmt(receipt.amount), {
    x: width - 180,
    y: y + 8,
    size: 20,
    font: bold,
    color: GREEN,
  });

  y -= 36;
  if (receipt.notes) {
    page.drawText(`Notes: ${receipt.notes}`, { x: 40, y, size: 9, font: regular, color: GRAY });
    y -= 16;
  }

  drawHRule(page, y, width, GOLD);
  y -= 16;
  page.drawText("This is a computer-generated receipt. No signature required.", {
    x: 40,
    y,
    size: 8,
    font: regular,
    color: GRAY,
  });

  return doc.save();
}

export async function generateStatementPdf(statement: {
  masjid: { name: string; address: string };
  month: string; // e.g. "June 2026"
  total_outstanding?: number; // shown as footer total when provided
  members: Array<{
    full_name: string;
    member_number: string | null;
    phone: string;
    opening_balance?: number; // balance before this period
    charges: number;
    discounts: number;
    payments: number;
    balance: number; // closing balance (or all-time balance for on-demand)
    entries: Array<{
      created_at: string;
      type: string;
      amount: number;
      description: string | null;
    }>;
  }>;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);

  function addPage() {
    const p = doc.addPage([595, 842]); // A4
    const { width, height } = p.getSize();
    // Page header
    p.drawRectangle({ x: 0, y: height - 50, width, height: 50, color: GREEN });
    p.drawText(statement.masjid.name, { x: 40, y: height - 22, size: 14, font: bold, color: rgb(1, 1, 1) });
    p.drawText(`Monthly Statement — ${statement.month}`, { x: 40, y: height - 36, size: 9, font: regular, color: GOLD });
    p.drawText(`Generated ${new Date().toLocaleDateString("en-IN")}`, {
      x: width - 180,
      y: height - 30,
      size: 9,
      font: regular,
      color: GOLD,
    });
    return { page: p, width, y: height - 70 };
  }

  let { page, width, y } = addPage();

  const showOpeningBalance = statement.members.some((m) => m.opening_balance !== undefined);

  for (const member of statement.members) {
    if (y < 180) {
      ({ page, width, y } = addPage());
    }

    // Member header
    page.drawRectangle({ x: 38, y: y - 4, width: width - 76, height: 28, color: rgb(0.94, 0.98, 0.95) });
    page.drawText(member.full_name, { x: 46, y: y + 10, size: 10, font: bold, color: GREEN });
    if (member.member_number) {
      page.drawText(member.member_number, { x: 46, y: y - 1, size: 8, font: regular, color: GRAY });
    }
    const balColor = member.balance > 0 ? rgb(0.8, 0.1, 0.1) : GREEN;
    const balLabel = showOpeningBalance ? "Closing Balance:" : "Balance:";
    page.drawText(`${balLabel} ${fmt(member.balance)}`, {
      x: width - 200,
      y: y + 6,
      size: 11,
      font: bold,
      color: balColor,
    });
    y -= 34;

    // Opening balance row (monthly statement only)
    if (member.opening_balance !== undefined) {
      if (y < 80) ({ page, width, y } = addPage());
      page.drawText("Opening Balance (brought forward)", { x: 50, y, size: 8, font: regular, color: GRAY });
      const obColor = member.opening_balance > 0 ? rgb(0.7, 0.1, 0.1) : GREEN;
      page.drawText(fmt(member.opening_balance), { x: width - 150, y, size: 8, font: bold, color: obColor });
      y -= 12;
      drawHRule(page, y, width, GRAY);
      y -= 10;
    }

    // Ledger entries for the period
    for (const entry of member.entries.slice(0, 8)) {
      if (y < 80) {
        ({ page, width, y } = addPage());
      }
      const sign = entry.type === "charge" ? "+" : "−";
      const color = entry.type === "charge" ? rgb(0.7, 0.1, 0.1) : GREEN;
      page.drawText(new Date(entry.created_at).toLocaleDateString("en-IN"), {
        x: 50, y, size: 8, font: regular, color: GRAY,
      });
      page.drawText(entry.description ?? entry.type, {
        x: 120, y, size: 8, font: regular, color: BLACK,
      });
      page.drawText(`${sign} ${fmt(entry.amount)}`, {
        x: width - 150, y, size: 8, font: bold, color,
      });
      y -= 12;
    }

    // Summary row
    if (y < 60) ({ page, width, y } = addPage());
    page.drawText(
      `Charges: ${fmt(member.charges)}   Discounts: ${fmt(member.discounts)}   Payments: ${fmt(member.payments)}`,
      { x: 50, y, size: 8, font: regular, color: GRAY }
    );
    y -= 20;
    drawHRule(page, y, width);
    y -= 16;
  }

  // Total outstanding footer (monthly statement only)
  if (statement.total_outstanding !== undefined) {
    if (y < 60) ({ page, width, y } = addPage());
    y -= 8;
    page.drawRectangle({ x: 38, y: y - 12, width: width - 76, height: 30, color: rgb(0.94, 0.98, 0.95) });
    page.drawText("TOTAL OUTSTANDING — ALL MEMBERS", { x: 46, y: y + 4, size: 9, font: bold, color: GREEN });
    const totalColor = statement.total_outstanding > 0 ? rgb(0.8, 0.1, 0.1) : GREEN;
    page.drawText(fmt(statement.total_outstanding), {
      x: width - 160,
      y: y + 4,
      size: 12,
      font: bold,
      color: totalColor,
    });
    y -= 22;
    drawHRule(page, y, width, GOLD);
  }

  return doc.save();
}
