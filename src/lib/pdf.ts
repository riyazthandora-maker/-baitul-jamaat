import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type { MemberStatement } from "@/lib/statements";

const GREEN = rgb(0.102, 0.42, 0.235); // #1a6b3c
const RED   = rgb(0.72, 0.11, 0.11);   // #b81c1c
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
  receipt_date?: string | null;
  amount: number;
  notes: string | null;
  title?: string;
  payeeLabel?: string;
  amountLabel?: string;
  theme?: "green" | "red";
  payee: { name: string; identifier: string | null; phone: string | null };
  masjid: { name: string; address: string; phone: string };
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 420]); // A5 landscape-ish
  const { width, height } = page.getSize();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);

  const accent = receipt.theme === "red" ? RED : GREEN;

  let y = height - 40;

  // Header band
  page.drawRectangle({ x: 0, y: y - 10, width, height: 54, color: accent });
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
  page.drawText(new Date((receipt.receipt_date ?? receipt.created_at) + (receipt.receipt_date ? "T00:00:00" : "")).toLocaleDateString("en-IN"), {
    x: width - 180,
    y: y + 4,
    size: 10,
    font: regular,
    color: GOLD,
  });

  y -= 70;

  // Two-column info
  const col2 = width / 2 + 20;

  page.drawText(receipt.payeeLabel ?? "RECEIVED FROM", { x: 40, y, size: 8, font: bold, color: GRAY });
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
  page.drawText(receipt.amountLabel ?? "AMOUNT RECEIVED", { x: 50, y: y + 8, size: 9, font: bold, color: GRAY });
  page.drawText(fmt(receipt.amount), {
    x: width - 180,
    y: y + 8,
    size: 20,
    font: bold,
    color: accent,
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
      transaction_date?: string | null;
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
    for (const entry of member.entries) {
      if (y < 80) {
        ({ page, width, y } = addPage());
      }
      const sign = entry.type === "charge" ? "+" : "−";
      const color = entry.type === "charge" ? rgb(0.7, 0.1, 0.1) : GREEN;
      const rawDate = entry.transaction_date ?? entry.created_at;
      // DATE strings parse as UTC midnight; add noon to avoid day-off in IST
      const entryDate = new Date(rawDate.includes("T") ? rawDate : `${rawDate}T12:00:00`);
      page.drawText(entryDate.toLocaleDateString("en-IN"), {
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

export async function generateFamiliesReportPdf(report: {
  masjid: { name: string; address: string };
  families: Array<{
    name: string;
    members: Array<{ full_name: string; relationship: string; member_number: string | null; phone: string }>;
  }>;
  unattachedMembers: Array<{ full_name: string; member_number: string | null; phone: string }>;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);

  const totalMembers = report.families.reduce((s, f) => s + f.members.length, 0);

  function addPage() {
    const p = doc.addPage([595, 842]);
    const { width, height } = p.getSize();
    p.drawRectangle({ x: 0, y: height - 54, width, height: 54, color: GREEN });
    p.drawText("FAMILIES REPORT", { x: 40, y: height - 24, size: 16, font: bold, color: rgb(1, 1, 1) });
    p.drawText(report.masjid.name, { x: 40, y: height - 40, size: 9, font: regular, color: GOLD });
    p.drawText(`Generated ${new Date().toLocaleDateString("en-IN")}`, {
      x: width - 190, y: height - 32, size: 9, font: regular, color: GOLD,
    });
    return { page: p, width, y: height - 70 };
  }

  let { page, width, y } = addPage();

  // Summary box
  page.drawRectangle({ x: 38, y: y - 54, width: width - 76, height: 64, color: rgb(0.94, 0.98, 0.95) });
  page.drawLine({ start: { x: 38 + (width - 76) / 3, y: y - 54 }, end: { x: 38 + (width - 76) / 3, y: y + 10 }, thickness: 0.5, color: GRAY });
  page.drawLine({ start: { x: 38 + (2 * (width - 76)) / 3, y: y - 54 }, end: { x: 38 + (2 * (width - 76)) / 3, y: y + 10 }, thickness: 0.5, color: GRAY });

  const col = (width - 76) / 3;
  const stats = [
    { label: "Total Families", value: String(report.families.length) },
    { label: "Members in Families", value: String(totalMembers) },
    { label: "Unattached Members", value: String(report.unattachedMembers.length) },
  ];
  stats.forEach((s, i) => {
    const x = 38 + col * i + col / 2;
    page.drawText(s.value, { x: x - (bold.widthOfTextAtSize(s.value, 22) / 2), y: y - 12, size: 22, font: bold, color: GREEN });
    page.drawText(s.label, { x: x - (regular.widthOfTextAtSize(s.label, 8) / 2), y: y - 34, size: 8, font: regular, color: GRAY });
  });
  y -= 72;
  drawHRule(page, y, width, GOLD);
  y -= 16;

  // Families section
  page.drawText("FAMILIES", { x: 40, y, size: 10, font: bold, color: GREEN });
  y -= 16;

  for (const family of report.families) {
    if (y < 100) ({ page, width, y } = addPage());

    page.drawRectangle({ x: 38, y: y - 4, width: width - 76, height: 20, color: GREEN });
    page.drawText(family.name, { x: 46, y: y + 4, size: 9, font: bold, color: rgb(1, 1, 1) });
    page.drawText(`${family.members.length} member(s)`, {
      x: width - 130, y: y + 4, size: 8, font: regular, color: GOLD,
    });
    y -= 22;

    for (const m of family.members) {
      if (y < 80) ({ page, width, y } = addPage());
      const rel = m.relationship.charAt(0).toUpperCase() + m.relationship.slice(1);
      page.drawText(`• ${m.full_name}`, { x: 52, y, size: 9, font: bold, color: BLACK });
      page.drawText(rel, { x: 230, y, size: 8, font: regular, color: GRAY });
      if (m.member_number) page.drawText(m.member_number, { x: 310, y, size: 8, font: regular, color: GRAY });
      page.drawText(m.phone, { x: width - 140, y, size: 8, font: regular, color: GRAY });
      y -= 13;
    }
    y -= 6;
  }

  // Unattached members section
  if (report.unattachedMembers.length > 0) {
    if (y < 120) ({ page, width, y } = addPage());
    drawHRule(page, y, width, GOLD);
    y -= 16;
    page.drawText("MEMBERS NOT ATTACHED TO ANY FAMILY", { x: 40, y, size: 10, font: bold, color: GOLD });
    y -= 16;

    for (const m of report.unattachedMembers) {
      if (y < 80) ({ page, width, y } = addPage());
      page.drawText(`• ${m.full_name}`, { x: 46, y, size: 9, font: bold, color: BLACK });
      if (m.member_number) page.drawText(m.member_number, { x: 280, y, size: 8, font: regular, color: GRAY });
      page.drawText(m.phone, { x: width - 140, y, size: 8, font: regular, color: GRAY });
      y -= 13;
    }
  }

  return doc.save();
}

// ── Member monthly statement ──────────────────────────────────────────────

const WHITE = rgb(1, 1, 1);
const LIGHT_GREEN = rgb(0.94, 0.98, 0.95);
const ZEBRA = rgb(0.975, 0.985, 0.978);

/** StandardFonts are WinAnsi-only; replace anything it cannot encode instead of throwing. */
function sanitizeForFont(text: string, font: PDFFont): string {
  let safe = "";
  for (const char of Array.from(text)) {
    try {
      font.encodeText(char);
      safe += char;
    } catch {
      safe += "?";
    }
  }
  return safe;
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  maxLines = 2
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = "";

    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      current = word;
      continue;
    }

    let chunk = "";
    for (const char of Array.from(word)) {
      const next = chunk + char;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        chunk = next;
      } else {
        if (chunk) lines.push(chunk);
        chunk = char;
      }
    }
    current = chunk;
  }
  if (current) lines.push(current);

  if (lines.length <= maxLines) return lines;
  const trimmed = lines.slice(0, maxLines);
  let last = trimmed[maxLines - 1];
  while (last.length > 0 && font.widthOfTextAtSize(`${last}…`, size) > maxWidth) {
    last = last.slice(0, -1);
  }
  trimmed[maxLines - 1] = `${last}…`;
  return trimmed;
}

function truncateToWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let result = text;
  while (result.length > 0 && font.widthOfTextAtSize(`${result}…`, size) > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function drawRight(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>
) {
  page.drawText(text, {
    x: rightX - font.widthOfTextAtSize(text, size),
    y,
    size,
    font,
    color,
  });
}

function money(amount: number): string {
  const abs = Math.abs(amount);
  return `${amount < 0 ? "-" : ""}Rs. ${abs.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function displayDate(date: string): string {
  // Date-only strings parse as UTC midnight; add noon to avoid a day shift in IST.
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function generateMemberStatementPdf(
  statement: MemberStatement
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);

  const WIDTH = 595;
  const HEIGHT = 842;
  const MARGIN = 40;
  const CONTENT_WIDTH = WIDTH - MARGIN * 2;

  const DATE_X = MARGIN + 6;
  const DESC_X = MARGIN + 86;
  const DEBIT_RIGHT = MARGIN + CONTENT_WIDTH - 150;
  const CREDIT_RIGHT = MARGIN + CONTENT_WIDTH - 75;
  const BALANCE_RIGHT = MARGIN + CONTENT_WIDTH - 6;
  const DESC_WIDTH = DEBIT_RIGHT - DESC_X - 10;

  const generatedOn = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const pages: PDFPage[] = [];

  function drawMasthead(page: PDFPage) {
    page.drawRectangle({
      x: 0,
      y: HEIGHT - 64,
      width: WIDTH,
      height: 64,
      color: GREEN,
    });
    const name = sanitizeForFont(statement.masjid.name, bold);
    page.drawText(truncateToWidth(name, bold, 14, 300), {
      x: MARGIN,
      y: HEIGHT - 26,
      size: 14,
      font: bold,
      color: WHITE,
    });
    const address = sanitizeForFont(statement.masjid.address, regular);
    page.drawText(truncateToWidth(address, regular, 8, 300), {
      x: MARGIN,
      y: HEIGHT - 40,
      size: 8,
      font: regular,
      color: GOLD,
    });
    const phone = sanitizeForFont(`Ph: ${statement.masjid.phone}`, regular);
    page.drawText(phone, {
      x: MARGIN,
      y: HEIGHT - 51,
      size: 8,
      font: regular,
      color: GOLD,
    });

    const title = "MEMBER STATEMENT";
    drawRight(page, title, WIDTH - MARGIN, HEIGHT - 25, 11, bold, WHITE);
    drawRight(
      page,
      sanitizeForFont(statement.monthLabel, bold),
      WIDTH - MARGIN,
      HEIGHT - 39,
      9,
      bold,
      GOLD
    );
    drawRight(
      page,
      sanitizeForFont(`Generated ${generatedOn}`, regular),
      WIDTH - MARGIN,
      HEIGHT - 50,
      7,
      regular,
      GOLD
    );
  }

  function addPage(): PDFPage {
    const page = doc.addPage([WIDTH, HEIGHT]);
    pages.push(page);
    drawMasthead(page);
    return page;
  }

  function drawTableHeader(page: PDFPage, top: number): number {
    page.drawRectangle({
      x: MARGIN,
      y: top - 20,
      width: CONTENT_WIDTH,
      height: 20,
      color: GREEN,
    });
    const baseline = top - 13.5;
    page.drawText("DATE", { x: DATE_X, y: baseline, size: 7.5, font: bold, color: WHITE });
    page.drawText("DESCRIPTION", { x: DESC_X, y: baseline, size: 7.5, font: bold, color: WHITE });
    drawRight(page, "DEBIT", DEBIT_RIGHT, baseline, 7.5, bold, WHITE);
    drawRight(page, "CREDIT", CREDIT_RIGHT, baseline, 7.5, bold, WHITE);
    drawRight(page, "BALANCE", BALANCE_RIGHT, baseline, 7.5, bold, WHITE);
    return top - 24;
  }

  let page = addPage();
  let y = HEIGHT - 84;

  // ── Member details panel ──
  const panelHeight = 66;
  page.drawRectangle({
    x: MARGIN,
    y: y - panelHeight,
    width: CONTENT_WIDTH,
    height: panelHeight,
    color: LIGHT_GREEN,
  });
  const col2 = WIDTH / 2 + 10;

  page.drawText("MEMBER", {
    x: MARGIN + 10,
    y: y - 14,
    size: 6.5,
    font: bold,
    color: GRAY,
  });
  const memberName = sanitizeForFont(statement.member.full_name, bold);
  page.drawText(truncateToWidth(memberName, bold, 11, col2 - MARGIN - 24), {
    x: MARGIN + 10,
    y: y - 29,
    size: 11,
    font: bold,
    color: GREEN,
  });

  const memberMeta = [
    statement.member.member_number ?? "",
    statement.member.phone ? `Ph: ${statement.member.phone}` : "",
  ]
    .filter(Boolean)
    .join("    ");
  if (memberMeta) {
    page.drawText(sanitizeForFont(memberMeta, regular), {
      x: MARGIN + 10,
      y: y - 43,
      size: 8,
      font: regular,
      color: GRAY,
    });
  }
  if (statement.member.email) {
    page.drawText(
      truncateToWidth(
        sanitizeForFont(statement.member.email, regular),
        regular,
        8,
        col2 - MARGIN - 24
      ),
      { x: MARGIN + 10, y: y - 55, size: 8, font: regular, color: GRAY }
    );
  }

  page.drawText("STATEMENT PERIOD", {
    x: col2,
    y: y - 14,
    size: 6.5,
    font: bold,
    color: GRAY,
  });
  page.drawText(sanitizeForFont(statement.monthLabel, bold), {
    x: col2,
    y: y - 29,
    size: 11,
    font: bold,
    color: GREEN,
  });
  page.drawText(
    sanitizeForFont(`Generated ${generatedOn}`, regular),
    { x: col2, y: y - 43, size: 8, font: regular, color: GRAY }
  );

  y -= panelHeight + 12;

  // ── Summary strip ──
  const cells = [
    { label: "OPENING BALANCE", value: statement.openingBalance, redWhenPositive: false },
    { label: "CHARGES", value: statement.charges, redWhenPositive: false },
    { label: "DISCOUNTS", value: statement.discounts, redWhenPositive: false },
    { label: "PAYMENTS", value: statement.payments, redWhenPositive: false },
    { label: "CLOSING BALANCE", value: statement.closingBalance, redWhenPositive: true },
  ];
  const cellWidth = CONTENT_WIDTH / cells.length;
  const summaryHeight = 46;
  page.drawRectangle({
    x: MARGIN,
    y: y - summaryHeight,
    width: CONTENT_WIDTH,
    height: summaryHeight,
    color: LIGHT_GREEN,
  });
  cells.forEach((cell, index) => {
    const cellX = MARGIN + cellWidth * index;
    if (index > 0) {
      page.drawLine({
        start: { x: cellX, y: y - summaryHeight },
        end: { x: cellX, y },
        thickness: 0.5,
        color: rgb(0.85, 0.9, 0.86),
      });
    }
    page.drawText(cell.label, {
      x: cellX + 6,
      y: y - 14,
      size: 6,
      font: bold,
      color: GRAY,
    });
    const text = money(cell.value);
    let size = 9;
    while (size > 6.5 && bold.widthOfTextAtSize(text, size) > cellWidth - 12) {
      size -= 0.5;
    }
    const color = cell.redWhenPositive && cell.value > 0 ? RED : GREEN;
    page.drawText(text, {
      x: cellX + 6,
      y: y - 31,
      size,
      font: bold,
      color,
    });
  });
  y -= summaryHeight + 14;

  // ── Ledger table ──
  y = drawTableHeader(page, y);

  if (statement.entries.length === 0) {
    page.drawText("No transactions this month.", {
      x: MARGIN + 6,
      y: y - 8,
      size: 9,
      font: regular,
      color: GRAY,
    });
    y -= 28;
  }

  statement.entries.forEach((entry, index) => {
    const description = sanitizeForFont(entry.description, regular);
    const descLines = wrapText(description, regular, 8, DESC_WIDTH, 2);
    const rowHeight = descLines.length > 1 ? 23 : 14;

    if (y - rowHeight < 66) {
      page = addPage();
      y = drawTableHeader(page, HEIGHT - 84);
    }

    if (index % 2 === 1) {
      page.drawRectangle({
        x: MARGIN,
        y: y - 6,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: ZEBRA,
      });
    }

    page.drawText(sanitizeForFont(displayDate(entry.date), regular), {
      x: DATE_X,
      y,
      size: 8,
      font: regular,
      color: GRAY,
    });
    descLines.forEach((line, lineIndex) => {
      page.drawText(line, {
        x: DESC_X,
        y: y - lineIndex * 10,
        size: 8,
        font: regular,
        color: BLACK,
      });
    });
    if (entry.debit > 0) {
      drawRight(page, money(entry.debit), DEBIT_RIGHT, y, 8, regular, RED);
    }
    if (entry.credit > 0) {
      drawRight(page, money(entry.credit), CREDIT_RIGHT, y, 8, regular, GREEN);
    }
    const balanceColor = entry.balance > 0 ? RED : GREEN;
    drawRight(page, money(entry.balance), BALANCE_RIGHT, y, 8, bold, balanceColor);

    y -= rowHeight;
  });

  // ── Closing balance ──
  if (y < 110) {
    page = addPage();
    y = HEIGHT - 84;
  }
  y -= 4;
  drawHRule(page, y, WIDTH, rgb(0.85, 0.9, 0.86));
  y -= 18;
  page.drawText("CLOSING BALANCE (END OF MONTH)", {
    x: DATE_X,
    y,
    size: 9,
    font: bold,
    color: GREEN,
  });
  drawRight(
    page,
    money(statement.closingBalance),
    BALANCE_RIGHT,
    y,
    11,
    bold,
    statement.closingBalance > 0 ? RED : GREEN
  );

  // ── Footer on every page ──
  pages.forEach((p, index) => {
    p.drawLine({
      start: { x: MARGIN, y: 46 },
      end: { x: WIDTH - MARGIN, y: 46 },
      thickness: 0.5,
      color: GRAY,
    });
    const left = sanitizeForFont(
      `Computer-generated statement - ${statement.masjid.name}`,
      regular
    );
    p.drawText(left, {
      x: MARGIN,
      y: 34,
      size: 7,
      font: regular,
      color: GRAY,
    });
    drawRight(
      p,
      `Page ${index + 1} of ${pages.length}`,
      WIDTH - MARGIN,
      34,
      7,
      regular,
      GRAY
    );
  });

  return doc.save();
}
