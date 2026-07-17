import { NextRequest, NextResponse } from "next/server";
import { extractIdDocumentData } from "@/lib/gemini";

const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

async function fileToBase64(file: File) {
  const bytes = await file.arrayBuffer();
  return Buffer.from(bytes).toString("base64");
}

function resolveMime(file: File) {
  return SUPPORTED_TYPES.includes(file.type) ? file.type : "image/jpeg";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  await params;

  try {
    const formData = await request.formData();
    const front = formData.get("front") as File | null;
    const back = formData.get("back") as File | null;

    if (!front || front.size === 0) {
      return NextResponse.json({ error: "Front side is required" }, { status: 400 });
    }
    if (front.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Front image exceeds 5 MB" }, { status: 400 });
    }
    if (back && back.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Back image exceeds 5 MB" }, { status: 400 });
    }

    const frontBase64 = await fileToBase64(front);
    const frontMime = resolveMime(front);

    let backBase64: string | undefined;
    let backMime: string | undefined;
    if (back && back.size > 0) {
      backBase64 = await fileToBase64(back);
      backMime = resolveMime(back);
    }

    const extracted = await extractIdDocumentData(frontBase64, frontMime, backBase64, backMime);
    return NextResponse.json({ ocr: extracted });
  } catch (err) {
    console.error("[OCR] route error:", err);
    return NextResponse.json({ ocr: null, error: "OCR failed" });
  }
}
