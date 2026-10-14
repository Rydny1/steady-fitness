import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { todayRiga } from "@/lib/dates";
import { buildZip, type ZipEntry } from "@/lib/zip";

// All photos in one zip. Downloads each file through the user's own session (RLS).
export async function GET(req: NextRequest) {
  // Downloads start from our own pages. Refuse requests that began on another site.
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: rows, error } = await supabase
    .from("photos")
    .select("kind,storage_path,taken_on,pose")
    .order("taken_on");
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });

  const entries: ZipEntry[] = [];
  let i = 0;
  for (const r of rows ?? []) {
    const bucket = r.kind === "meal" ? "meal-photos" : "progress-photos";
    const { data: file } = await supabase.storage.from(bucket).download(r.storage_path);
    if (!file) continue;
    i += 1;
    const label = r.kind === "progress" ? `${r.taken_on}-${r.pose ?? "photo"}` : `${r.taken_on}-meal-${i}`;
    entries.push({
      name: `${r.kind}/${label}.jpg`,
      data: new Uint8Array(await file.arrayBuffer()),
    });
  }

  const zip = buildZip(entries);
  return new NextResponse(Buffer.from(zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="steady-photos-${todayRiga()}.zip"`,
      "cache-control": "no-store",
    },
  });
}
