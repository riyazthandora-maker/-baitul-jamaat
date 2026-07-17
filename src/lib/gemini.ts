import { GoogleGenerativeAI } from "@google/generative-ai";

const getModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
};

export async function extractIdDocumentData(
  frontBase64: string,
  frontMimeType: string,
  backBase64?: string,
  backMimeType?: string
): Promise<{
  name: string | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
  id_type: string | null;
  id_last4: string | null;
} | null> {
  const model = getModel();
  const hasBack = !!backBase64 && !!backMimeType;
  const prompt = hasBack
    ? `You have the front and back of an Indian identity document (Aadhaar, PAN, Passport, or Voter ID). Extract ALL information combining both sides and return ONLY a valid JSON object:
{"name":"full name or null","dob":"YYYY-MM-DD or null","gender":"Male or Female or Other or null","address":"complete address from back side or null","id_type":"aadhaar or passport or pan or voter_id or other","id_last4":"last 4 digits of ID number only or null"}
Return ONLY the JSON. No markdown, no explanation.`
    : `You are an OCR assistant. Extract information from this Indian identity document (Aadhaar, PAN, Passport, or Voter ID) and return ONLY a valid JSON object:
{"name":"full name as on document or null","dob":"YYYY-MM-DD format or null","gender":"Male or Female or Other or null","address":"full address or null","id_type":"aadhaar or passport or pan or voter_id or other","id_last4":"last 4 digits of the ID number only or null"}
Return ONLY the JSON object. No markdown, no explanation.`;

  const parts: Parameters<typeof model.generateContent>[0] = [
    { inlineData: { mimeType: frontMimeType, data: frontBase64 } },
    ...(hasBack ? [{ inlineData: { mimeType: backMimeType!, data: backBase64! } }] : []),
    prompt,
  ];

  try {
    const result = await model.generateContent(parts);
    const text = result.response.text().trim();
    const cleaned = text
      .replace(/^```json\n?/, "")
      .replace(/```\n?$/, "")
      .trim();
    return JSON.parse(cleaned);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("429") || msg.includes("quota")) {
      console.error("[Gemini OCR] quota exceeded — enable billing at console.cloud.google.com/billing");
    } else {
      console.error("[Gemini OCR] failed:", msg);
    }
    return null;
  }
}

export async function detectDuplicates(
  newMember: { phone: string; full_name: string; dob: string | null; address: string | null },
  existingMembers: Array<{
    phone: string;
    full_name: string;
    dob: string | null;
    address: string | null;
    member_number: string | null;
  }>
): Promise<{
  classification: "duplicate" | "possible_duplicate" | "new";
  reason: string | null;
}> {
  if (existingMembers.length === 0) return { classification: "new", reason: null };

  try {
    const model = getModel();
    const prompt = `You are a duplicate detection assistant for a mosque membership system.

New member submission:
Name: ${newMember.full_name}
Address: ${newMember.address ?? "unknown"}
DOB: ${newMember.dob ?? "unknown"}
Phone: ${newMember.phone}

Existing members:
${existingMembers
  .map(
    (m, i) =>
      `${i + 1}. Name: ${m.full_name}, Address: ${m.address ?? "unknown"}, DOB: ${m.dob ?? "unknown"}, Phone: ${m.phone}, ID: ${m.member_number ?? "pending"}`
  )
  .join("\n")}

Classify the new submission as one of:
- "duplicate": if name AND address are nearly identical (accounting for spelling/formatting variations)
- "possible_duplicate": if name closely matches but address differs or is missing
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
