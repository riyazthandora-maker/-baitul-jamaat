import { ID_TYPE_OPTIONS, normalizeIdType } from "@/lib/member-types";

export interface ImportRow {
  full_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  gender: string;
  address: string;
  qualification: string;
  job: string;
  id_type: string;
  id_last4: string;
  opening_balance: string;
}

export interface ValidatedRow {
  rowNum: number;
  data: ImportRow;
  status: "valid" | "error";
  errors: string[];
}

export const CSV_TEMPLATE_HEADERS: string[] = [
  "full_name",
  "phone",
  "email",
  "date_of_birth",
  "gender",
  "address",
  "qualification",
  "job",
  "id_type",
  "id_last4",
  "opening_balance",
];

const PHONE_RE = /^(\+91|0)?[6-9]\d{9}$|^\+971[0-9]{8,9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{2}-\d{2}-\d{4}$/;
const VALID_GENDERS = ["Male", "Female", "Other"];

export function validateRow(row: ImportRow, rowNum: number): ValidatedRow {
  const errors: string[] = [];

  if (!row.full_name || row.full_name.trim().length < 2) {
    errors.push("Full name is required (min 2 characters)");
  }

  if (!row.phone || !PHONE_RE.test(row.phone.trim())) {
    errors.push("Phone must be a valid 10-digit Indian or UAE number");
  }

  if (row.email && row.email.trim() && !EMAIL_RE.test(row.email.trim())) {
    errors.push("Invalid email format");
  }

  if (row.date_of_birth && row.date_of_birth.trim()) {
    if (!DATE_RE.test(row.date_of_birth.trim())) {
      errors.push("Date of birth must be in DD-MM-YYYY format");
    } else {
      const d = parseDMY(row.date_of_birth.trim());
      if (!d || isNaN(d.getTime())) {
        errors.push("Date of birth is not a valid date");
      }
    }
  }

  if (row.gender && row.gender.trim() && !VALID_GENDERS.includes(row.gender.trim())) {
    errors.push(`Gender must be one of: ${VALID_GENDERS.join(", ")}`);
  }

  if (row.id_type && row.id_type.trim() && !(ID_TYPE_OPTIONS as readonly string[]).includes(row.id_type.trim())) {
    errors.push(`ID type must be one of: ${ID_TYPE_OPTIONS.join(", ")}`);
  }

  if (row.id_last4 && row.id_last4.trim()) {
    if (!/^\d{4}$/.test(row.id_last4.trim())) {
      errors.push("ID last 4 digits must be exactly 4 numeric digits");
    }
  }

  if (row.opening_balance && row.opening_balance.trim()) {
    const n = Number(row.opening_balance.trim());
    if (isNaN(n) || n < 0) {
      errors.push("Opening balance must be a non-negative number");
    }
  }

  return {
    rowNum,
    data: row,
    status: errors.length > 0 ? "error" : "valid",
    errors,
  };
}

export function parseCSV(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));

  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] ?? "").trim();
    });
    return {
      full_name: obj["full_name"] ?? "",
      phone: obj["phone"] ?? "",
      email: obj["email"] ?? "",
      date_of_birth: obj["date_of_birth"] ?? "",
      gender: obj["gender"] ?? "",
      address: obj["address"] ?? "",
      qualification: obj["qualification"] ?? "",
      job: obj["job"] ?? "",
      id_type: normalizeIdType(obj["id_type"]) || "",
      id_last4: obj["id_last4"] ?? "",
      opening_balance: obj["opening_balance"] ?? "",
    };
  });
}

function parseDMY(s: string): Date | null {
  const [dd, mm, yyyy] = s.split("-");
  if (!dd || !mm || !yyyy) return null;
  return new Date(`${yyyy}-${mm}-${dd}`);
}

export function dmyToIso(s: string): string {
  if (!s || !DATE_RE.test(s)) return s;
  const [dd, mm, yyyy] = s.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// Quote fields containing a comma, quote, or newline so spreadsheet apps
// don't split them into extra cells (RFC 4180).
function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function generateTemplateCSV(): string {
  const header = CSV_TEMPLATE_HEADERS.map(csvEscape).join(",");
  const example1 = [
    "Ahmed Ali",
    "+919876543210",
    "ahmed@example.com",
    "15-06-1985",
    "Male",
    "123 Main Street, City",
    "Degree (BA/BSc/MBBS/BTech etc.)",
    "Software Engineer",
    "Aadhaar",
    "1234",
    "500",
  ]
    .map(csvEscape)
    .join(",");
  const example2 = [
    "Fatima Begum",
    "+919876543211",
    "",
    "22-03-1990",
    "Female",
    "456 Park Road, Town",
    "SSLC",
    "Teacher",
    "Passport",
    "5678",
    "0",
  ]
    .map(csvEscape)
    .join(",");
  return [header, example1, example2].join("\n");
}
