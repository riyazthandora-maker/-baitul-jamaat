import { NextRequest, NextResponse } from "next/server";
import { extractIdDocumentData } from "@/lib/gemini";

const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  // params consumed only to match route signature; masjid check done by middleware
  await params;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      // PDFs and unsupported types: return empty result, client falls back to manual
      return NextResponse.json({
        ocr: null,
        message: "PDF or unsupported type — fill manually",
      });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 5 MB)" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const extracted = await extractIdDocumentData(base64, file.type);
    return NextResponse.json({ ocr: extracted });
  } catch (err) {
    console.error("OCR error:", err);
    return NextResponse.json({ ocr: null, error: "OCR failed" });
  }
}
