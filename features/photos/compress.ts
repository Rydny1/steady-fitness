"use client";

// Re-encode on the client before upload: JPEG, longest side 1600 px, quality 0.8.
// Drawing to a canvas drops EXIF, including GPS location (SECURITY.md section 5).

export type Compressed = { blob: Blob; base64: string; width: number; height: number };

const MAX_SIDE = 1600;
const QUALITY = 0.8;

export async function compressImage(file: File): Promise<Compressed> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encode failed"))),
      "image/jpeg",
      QUALITY,
    ),
  );
  return { blob, base64: await blobToBase64(blob), width, height };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
