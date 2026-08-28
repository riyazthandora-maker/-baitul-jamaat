export const ID_TYPE_OPTIONS = ["Aadhaar", "Passport", "PAN", "Voter ID", "Other"] as const;

// Canonicalize every representation of a document type (snake_case from the
// registration form / OCR, Title Case from admin and CSV import) to one form.
const ID_TYPE_ALIASES: Record<string, string> = {
  aadhaar: "Aadhaar",
  passport: "Passport",
  pan: "PAN",
  "pan card": "PAN",
  voter_id: "Voter ID",
  "voter id": "Voter ID",
  voterid: "Voter ID",
  other: "Other",
};

export function normalizeIdType(value: string | null | undefined): string {
  const s = (value ?? "").trim();
  if (!s) return "";
  return ID_TYPE_ALIASES[s.toLowerCase()] ?? s;
}
