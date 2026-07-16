import { GoogleGenerativeAI } from "@google/generative-ai";

const getModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
};

export async function extractIdDocumentData(
  imageBase64: string,
  mimeType: string
): Promise<{
  name: string | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
  id_type: string | null;
  id_last4: string | null;
} | null> {
  const model = getModel();
  const prompt = `You are an OCR assistant. Extract information from this Indian identity document (Aadhaar, PAN, Passport, or Voter ID) and return ONLY a valid JSON object with these exact fields:
{"name":"full name as on document or null","dob":"YYYY-MM-DD format or null","gender":"Male or Female or Other or null","address":"full address or null","id_type":"aadhaar or passport or pan or voter_id or other","id_last4":"last 4 digits of the ID number only or null"}
Return ONLY the JSON object. No markdown, no explanation.`;

  try {
    const result = await model.generateContent([
      { inlineData: { mimeType, data: imageBase64 } },
      prompt,
    ]);
    const text = result.response.text().trim();
    const cleaned = text
      .replace(/^```json\n?/, "")
      .replace(/```\n?$/, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function detectDuplicates(
  newMember: { phone: string; full_name: string; dob: string | null },
  existingMembers: Array<{
    phone: string;
    full_name: string;
    dob: string | null;
    member_number: string | null;
  }>
): Promise<{
  classification: "duplicate" | "possible_duplicate" | "new";
  reason: string | null;
}> {
  if (existingMembers.length === 0) return { classification: "new", reason: null };

  // Exact phone match — short circuit without Gemini
  const exactPhone = existingMembers.find((m) => m.phone === newMember.phone);
  if (exactPhone) {
    return {
      classification: "duplicate",
      reason: `Phone number ${newMember.phone} already registered (member ${exactPhone.member_number ?? "pending"})`,
    };
  }

  try {
    const model = getModel();
    const prompt = `You are a duplicate detection assistant for a mosque membership system.

New member submission:
Name: ${newMember.full_name}
DOB: ${newMember.dob ?? "unknown"}
Phone: ${newMember.phone}

Existing members:
${existingMembers
  .map(
    (m, i) =>
      `${i + 1}. Name: ${m.full_name}, DOB: ${m.dob ?? "unknown"}, Phone: ${m.phone}, ID: ${m.member_number ?? "pending"}`
  )
  .join("\n")}

Classify the new submission as one of:
- "duplicate": if name AND DOB are nearly identical (accounting for spelling variations)
- "possible_duplicate": if name is fuzzy-similar but DOB differs or is unknown
- "new": no significant match

Return ONLY this JSON: {"classification":"duplicate|possible_duplicate|new","reason":"brief reason or null"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text
      .replace(/^```json\n?/, "")
      .replace(/```\n?$/, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return { classification: "new", reason: null };
  }
}
