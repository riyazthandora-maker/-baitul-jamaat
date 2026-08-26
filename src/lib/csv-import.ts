export interface ImportRow {
  full_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  gender: string;
  address: string;
  qualification: string;
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
  "id_type",
  "id_last4",
  "opening_balance",
];

const PHONE_RE = /^(\+91|0)?[6-9]\d{9}$|^\+971[0-9]{8,9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_GENDERS = ["Male", "Female", "Other"];
const VALID_ID_TYPES = ["Aadhaar", "Passport", "PAN", "Voter ID", "Other"];

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
      errors.push("Date of birth must be in YYYY-MM-DD format");
    } else {
      const d = new Date(row.date_of_birth.trim());
      if (isNaN(d.getTime())) {
        errors.push("Date of birth is not a valid date");
      }
    }
  }

  if (row.gender && row.gender.trim() && !VALID_GENDERS.includes(row.gender.trim())) {
    errors.push(`Gender must be one of: ${VALID_GENDERS.join(", ")}`);
  }

  if (!row.qualification || row.qualification.trim().length < 1) {
    errors.push("Qualification is required");
  }

  if (row.id_type && row.id_type.trim() && !VALID_ID_TYPES.includes(row.id_type.trim())) {
    errors.push(`ID type must be one of: ${VALID_ID_TYPES.join(", ")}`);
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
      id_type: obj["id_type"] ?? "",
      id_last4: obj["id_last4"] ?? "",
      opening_balance: obj["opening_balance"] ?? "",
    };
  });
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

export function generateTemplateCSV(): string {
  const header = CSV_TEMPLATE_HEADERS.join(",");
  const example1 = [
    "Ahmed Ali",
    "+919876543210",
    "ahmed@example.com",
    "1985-06-15",
    "Male",
    "123 Main Street, City",
    "Software Engineer",
    "Aadhaar",
    "1234",
    "500",
  ].join(",");
  const example2 = [
    "Fatima Begum",
    "+919876543211",
    "",
    "1990-03-22",
    "Female",
    "456 Park Road, Town",
    "Teacher",
    "Passport",
    "5678",
    "0",
  ].join(",");
  return [header, example1, example2].join("\n");
}
