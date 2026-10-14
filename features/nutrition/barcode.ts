// Barcode lookup: Chrome's BarcodeDetector plus Open Food Facts (free, has Rimi,
// Maxima and Lidl products). Exact label numbers, no AI. Runs in the browser.

export type BarcodeProduct = {
  name: string;
  kcalPer100: number;
  proteinPer100: number;
};

type OffResponse = {
  status?: number;
  product?: {
    product_name?: string;
    nutriments?: Record<string, unknown>;
  };
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Pure: turn an Open Food Facts response into per-100 g numbers, or null when unusable. */
export function parseOffProduct(json: unknown): BarcodeProduct | null {
  const r = json as OffResponse | null;
  if (!r || r.status === 0 || !r.product) return null;
  const n = r.product.nutriments ?? {};
  const kcal = num(n["energy-kcal_100g"]);
  const protein = num(n["proteins_100g"]);
  const name = (r.product.product_name ?? "").trim();
  if (kcal === null || protein === null || name === "") return null;
  return { name: name.slice(0, 80), kcalPer100: kcal, proteinPer100: protein };
}

/** Scale per-100 g numbers to the grams eaten. */
export function scaleToGrams(p: BarcodeProduct, grams: number) {
  const f = grams / 100;
  return {
    kcal: Math.max(0, Math.min(5000, Math.round(p.kcalPer100 * f))),
    protein_g: Math.max(0, Math.min(300, Math.round(p.proteinPer100 * f * 10) / 10)),
  };
}

export async function lookupBarcode(code: string): Promise<BarcodeProduct | null> {
  if (!/^\d{8,14}$/.test(code)) return null;
  const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,nutriments`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return parseOffProduct(await res.json());
  } catch {
    return null;
  }
}

type DetectorLike = {
  detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]>;
};
type DetectorCtor = new (opts: { formats: string[] }) => DetectorLike;

export function barcodeSupported(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

/** Reads one barcode from a photo file. Null when none is found or the browser can't. */
export async function readBarcode(file: File): Promise<string | null> {
  if (!barcodeSupported()) return null;
  const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
  const detector = new Ctor({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
  const bitmap = await createImageBitmap(file);
  try {
    const found = await detector.detect(bitmap);
    return found[0]?.rawValue ?? null;
  } finally {
    bitmap.close();
  }
}
