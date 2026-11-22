// Client-side image preparation helpers.
// Vercel rejects request bodies over ~4.5 MB before a route handler runs, so
// oversized photos must be shrunk in the browser before upload.

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp)$/i;

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_EXT.test(file.name);
}

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function encodeJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

function toJpegName(name: string): string {
  return name.replace(/\.[^./\\]+$/, "") + ".jpg";
}

interface PrepareOptions {
  maxBytes?: number;
  maxDimension?: number;
}

/**
 * Returns a File guaranteed to be at most `maxBytes` (for images). Non-image
 * files (e.g. PDFs) and files already within the limit are returned untouched.
 * Canvas cannot decode PDFs, so callers must size-check those separately.
 */
export async function prepareImageFile(
  file: File,
  { maxBytes = MAX_UPLOAD_BYTES, maxDimension = 1600 }: PrepareOptions = {}
): Promise<File> {
  if (!isImageFile(file) || file.size <= maxBytes) return file;

  const img = await loadImage(file);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) return file;

  let scale = Math.min(1, maxDimension / Math.max(width, height));
  let smallest: Blob | null = null;

  for (let pass = 0; pass < 4; pass++) {
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // Flatten any transparency onto white so JPEG doesn't render it black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    for (const quality of [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]) {
      const blob = await encodeJpeg(canvas, quality);
      if (!blob) continue;
      if (!smallest || blob.size < smallest.size) smallest = blob;
      if (blob.size <= maxBytes) {
        return new File([blob], toJpegName(file.name), { type: "image/jpeg" });
      }
    }

    scale *= 0.75;
  }

  return smallest
    ? new File([smallest], toJpegName(file.name), { type: "image/jpeg" })
    : file;
}
