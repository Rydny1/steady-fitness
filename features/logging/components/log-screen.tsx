"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Mic, X } from "lucide-react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils";
import {
  estimateMealAction,
  parseLogAction,
  saveEntries,
} from "../actions";
import type { DraftItem } from "../schema";
import { enqueue } from "../offline-queue";
import {
  collectTranscript,
  createRecognition,
  speechSupported,
  type Recognition,
} from "../speech";
import { fullBurn } from "@/features/nutrition/energy";
import { activityKcal } from "@/features/nutrition/targets";
import { compressImage, type Compressed } from "@/features/photos/compress";
import { uploadPhoto } from "@/features/photos/upload";
import { recordMealPhoto } from "@/features/photos/actions";
import {
  barcodeSupported,
  lookupBarcode,
  readBarcode,
  scaleToGrams,
  type BarcodeProduct,
} from "@/features/nutrition/barcode";
import { Button } from "@/components/ui/button";

export type SavedFood = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  kcal: number;
  protein_g: number;
};

type Mode = "text" | "photo";
type Source = "voice" | "text" | "photo" | "saved" | "barcode";

const nf = new Intl.NumberFormat("en-GB");

export function LogScreen({
  day,
  eatenKcal,
  budgetKcal,
  weightKg,
  saved,
}: {
  day: string;
  eatenKcal: number;
  budgetKcal: number;
  weightKg: number;
  saved: SavedFood[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("text");
  const [interim, setInterim] = useState("");
  const [typed, setTyped] = useState("");
  const [listening, setListening] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [unclear, setUnclear] = useState<string[]>([]);
  const [logId, setLogId] = useState<string | null>(null);
  const [source, setSource] = useState<Source>("voice");
  const [busy, setBusy] = useState<null | "parse" | "photo" | "save">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [photo, setPhoto] = useState<Compressed | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [grams, setGrams] = useState("100");
  const recognition = useRef<Recognition | null>(null);
  const typedRef = useRef("");
  const baseRef = useRef("");
  const usedVoice = useRef(false);
  const voiceOk = useMemo(() => speechSupported(), []);

  useEffect(() => {
    typedRef.current = typed;
  }, [typed]);

  useEffect(() => {
    return () => recognition.current?.stop();
  }, []);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  function reset() {
    setItems([]);
    setUnclear([]);
    setLogId(null);
    setMessage(null);
  }

  // ---- voice ----
  function toggleListening() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const r = createRecognition();
    if (!r) {
      setMessage(copy.log.voiceUnsupported);
      return;
    }
    reset();
    setInterim("");
    // Voice adds to whatever is already in the box, so you can fix a word by typing and keep talking.
    baseRef.current = typedRef.current.trim();
    usedVoice.current = true;
    r.onresult = (e) => {
      const { final, interim: partial } = collectTranscript(e);
      const next = (baseRef.current ? baseRef.current + " " : "") + final;
      typedRef.current = next;
      setTyped(next);
      setInterim(partial);
    };
    r.onerror = () => setListening(false);
    r.onend = () => {
      setListening(false);
      setInterim("");
      const text = typedRef.current.trim();
      if (text) void runParse(text, "voice");
    };
    recognition.current = r;
    setListening(true);
    r.start();
  }

  async function runParse(text: string, src: "voice" | "text") {
    setBusy("parse");
    setMessage(null);
    setSource(src);
    const res = await parseLogAction({ text, source: src, day });
    setBusy(null);
    if (!res.ok) {
      setMessage(
        res.reason === "limit" || res.reason === "ai_limit" ? copy.log.aiLimit : copy.log.parseFailed,
      );
      return;
    }
    setItems(res.items);
    setUnclear(res.unclear);
    setLogId(res.logId);
    if (res.items.length === 0) setMessage(copy.log.parseFailed);
  }

  // ---- photo ----
  async function onPickPhoto(file: File | undefined) {
    if (!file) return;
    reset();
    setBusy("photo");
    try {
      const c = await compressImage(file);
      setPhoto(c);
      setPhotoUrl(URL.createObjectURL(c.blob));
    } catch {
      setMessage(copy.errors.generic);
    }
    setBusy(null);
  }

  async function estimate() {
    if (!photo) return;
    setBusy("parse");
    setSource("photo");
    const res = await estimateMealAction({ base64: photo.base64, mime: "image/jpeg", day });
    setBusy(null);
    if (!res.ok) {
      setMessage(
        res.reason === "limit" || res.reason === "ai_limit" ? copy.log.aiLimit : copy.log.parseFailed,
      );
      return;
    }
    setItems(res.items);
    setLogId(res.logId);
  }

  async function onScan(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    setBusy("photo");
    try {
      const code = await readBarcode(file);
      const found = code ? await lookupBarcode(code) : null;
      if (found) setProduct(found);
      else setMessage(copy.log.scanNotFound);
    } catch {
      setMessage(copy.log.scanNotFound);
    }
    setBusy(null);
  }

  function addScanned() {
    if (!product) return;
    const g = Number(grams.replace(",", "."));
    if (!Number.isFinite(g) || g <= 0) return;
    const scaled = scaleToGrams(product, g);
    setSource("barcode");
    setItems((prev) => [
      ...prev,
      {
        kind: "food",
        name: product.name,
        quantity: g,
        unit: "g",
        kcal: scaled.kcal,
        protein_g: scaled.protein_g,
        confidence: 1,
      },
    ]);
    setProduct(null);
  }

  // ---- saved foods (tap logging) ----
  async function tapSaved(f: SavedFood) {
    const item: DraftItem = {
      kind: "food",
      name: f.name,
      quantity: f.quantity,
      unit: f.unit,
      kcal: f.kcal,
      protein_g: f.protein_g,
      confidence: 1,
    };
    const input = { day, logId: null, source: "saved" as const, items: [item] };
    if (!navigator.onLine) {
      enqueue(input);
      setMessage(copy.log.offline);
      return;
    }
    setBusy("save");
    const res = await saveEntries(input);
    setBusy(null);
    if (res.ok) router.push("/today");
    else setMessage(copy.errors.generic);
  }

  // ---- save ----
  const foodKcal = items.reduce((s, i) => (i.kind === "food" ? s + i.kcal : s), 0);
  const burned = items.reduce(
    (s, i) =>
      i.kind === "activity" ? s + activityKcal(i.activity_type, i.duration_min, weightKg) : s,
    0,
  );
  const after = eatenKcal + foodKcal;
  const budget = budgetKcal + burned;

  async function save() {
    if (items.length === 0) return;
    const input = { day, logId, source, items };
    if (!navigator.onLine) {
      if (source === "saved" || source === "barcode") {
        enqueue({ ...input, logId: null });
        setMessage(copy.log.offline);
      } else {
        setMessage(copy.log.offline);
      }
      return;
    }
    setBusy("save");
    const res = await saveEntries(input);
    if (!res.ok) {
      setBusy(null);
      setMessage(copy.errors.generic);
      return;
    }
    if (photo && res.foodIds[0]) {
      const path = await uploadPhoto("meal-photos", photo.blob);
      if (path) await recordMealPhoto({ path, takenOn: day, foodEntryId: res.foodIds[0] });
    }
    router.push("/today");
    router.refresh();
  }

  function updateItem(index: number, next: DraftItem) {
    setItems((prev) => prev.map((it, i) => (i === index ? next : it)));
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <h1 className="sr-only">{copy.log.title}</h1>
      <div className="flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))]">
        <Link
          href="/today"
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-card"
        >
          <X size={20} strokeWidth={2} aria-hidden="true" />
        </Link>
        <div
          role="tablist"
          aria-label="Log mode"
          className="grid w-[180px] grid-cols-2 rounded-full bg-card p-1"
        >
          {(["text", "photo"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "h-9 rounded-full text-small",
                mode === m ? "bg-ink font-semibold text-white" : "font-medium text-muted",
              )}
            >
              {m === "text" ? "Text" : copy.log.photo}
            </button>
          ))}
        </div>
        <span className="w-11" />
      </div>

      <div className="px-4 pt-8">
        {mode === "text" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = typed.trim();
              if (t) {
                reset();
                usedVoice.current = false;
                void runParse(t, "text");
              }
            }}
          >
            <label className="sr-only" htmlFor="typed">
              {copy.log.type}
            </label>
            <div className="relative rounded-list bg-card">
              <textarea
                id="typed"
                value={typed}
                onChange={(e) => {
                  setTyped(e.target.value);
                  usedVoice.current = false;
                }}
                rows={5}
                maxLength={4000}
                placeholder={listening ? copy.log.listening : voiceOk ? copy.log.typePlaceholder : copy.log.voiceUnsupported}
                className="block w-full resize-none rounded-list border-0 bg-transparent p-4 pr-16 text-[clamp(17px,4.6vw,20px)] leading-[1.35]"
              />
              {interim ? (
                <p className="px-4 pb-3 text-small text-faint" aria-live="polite">
                  {interim}
                </p>
              ) : null}
              {voiceOk ? (
                <button
                  type="button"
                  aria-label={listening ? "Stop listening" : "Speak"}
                  aria-pressed={listening}
                  onClick={toggleListening}
                  className={cn(
                    "absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full",
                    listening ? "bg-train text-white" : "bg-bg text-ink",
                  )}
                >
                  <Mic size={20} strokeWidth={1.9} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button type="submit" disabled={busy !== null || typed.trim() === ""}>
                {items.length > 0 ? "Read it again" : copy.log.parse}
              </Button>
              {typed.trim() !== "" ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setTyped("");
                    typedRef.current = "";
                    reset();
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </div>
            {items.length > 0 ? (
              <p className="mt-2 text-caption text-muted">Misheard something? Fix the words above and tap Read it again, or tap an item below.</p>
            ) : null}
          </form>
        ) : null}

        {mode === "photo" ? (
          <div className="flex flex-col gap-3">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt="Meal"
                className="max-h-[260px] w-full rounded-list object-cover"
              />
            ) : (
              <p className="text-body text-muted">{copy.log.estimate}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-card px-5 text-small font-semibold">
                <Camera size={18} strokeWidth={1.9} aria-hidden="true" />
                {copy.log.photo}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => void onPickPhoto(e.target.files?.[0])}
                />
              </label>
              {photo ? (
                <Button onClick={() => void estimate()} disabled={busy !== null}>
                  {copy.log.estimate}
                </Button>
              ) : null}
              {barcodeSupported() ? (
                <label className="inline-flex h-11 cursor-pointer items-center rounded-full bg-card px-5 text-small font-semibold">
                  {copy.log.scan}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => void onScan(e.target.files?.[0])}
                  />
                </label>
              ) : null}
            </div>
            {product ? (
              <div className="rounded-list bg-card p-4">
                <div className="text-body font-medium">{product.name}</div>
                <div className="text-caption text-muted">
                  {Math.round(product.kcalPer100)} kcal and {product.proteinPer100} g protein per 100 g
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <label className="flex h-11 items-center gap-2 rounded-ctl bg-bg px-3">
                    <span className="text-caption text-muted">{copy.log.grams}</span>
                    <input
                      value={grams}
                      onChange={(e) => setGrams(e.target.value)}
                      inputMode="decimal"
                      className="num w-16 border-0 bg-transparent text-[clamp(19px,5.9vw,22px)]"
                    />
                  </label>
                  <Button onClick={addScanned}>Add</Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {busy === "parse" ? (
          <p className="mt-4 text-small text-muted" role="status">
            Reading your log
          </p>
        ) : null}
        {message ? (
          <p role="alert" className="mt-4 text-small text-ink-2">
            {message}
          </p>
        ) : null}
      </div>

      {items.length > 0 ? (
        <section aria-labelledby="items-h">
          <div className="mx-4 mt-7 flex items-baseline justify-between">
            <h2 id="items-h" className="text-[clamp(17px,5.13vw,19px)] font-bold">
              {items.length} {items.length === 1 ? "item" : "items"}
            </h2>
            <span className="text-small text-muted">Tap any to change it</span>
          </div>
          <ul className="mx-4 mt-3 rounded-list bg-card px-[18px] py-1">
            {items.map((it, i) => (
              <li key={i} className={cn(i < items.length - 1 && "border-b border-line")}>
                <button
                  type="button"
                  onClick={() => setEditing(i)}
                  className="flex min-h-16 w-full items-center gap-3 text-left"
                >
                  <span
                    className={cn(
                      "h-[10px] w-[10px] flex-none rounded-full",
                      it.kind === "food" ? "bg-fuel" : it.kind === "activity" ? "bg-train" : "bg-protein",
                    )}
                  />
                  <ItemRow it={it} weightKg={weightKg} />
                </button>
              </li>
            ))}
          </ul>
          {unclear.length > 0 ? (
            <p className="mx-4 mt-3 text-caption text-muted">
              {copy.log.unclear}: {unclear.join(", ")}
            </p>
          ) : null}
          <div className="mx-4 mt-4 flex justify-between text-small">
            <span className="text-muted">After this log</span>
            <span>
              <span className="font-semibold">{nf.format(after)}</span>{" "}
              <span className="text-muted">of {nf.format(budget)} kcal</span>
            </span>
          </div>
        </section>
      ) : mode !== "photo" && saved.length > 0 ? (
        <section className="mt-8" aria-labelledby="saved-h">
          <h2 id="saved-h" className="mx-4 text-small font-semibold text-muted">
            {copy.log.savedFoods}
          </h2>
          <div className="mx-4 mt-3 flex flex-wrap gap-2">
            {saved.map((f) => (
              <button
                key={f.id}
                type="button"
                disabled={busy !== null}
                onClick={() => void tapSaved(f)}
                className="min-h-11 rounded-full bg-card px-4 text-small font-medium"
              >
                {f.name} <span className="text-muted">{f.kcal}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex-1" />
      <div className="flex items-center gap-[10px] px-4 pb-9 pt-6">
        <button
          type="button"
          aria-label={listening ? "Stop" : "Speak"}
          aria-pressed={listening}
          onClick={() => {
            setMode("text");
            toggleListening();
          }}
          className={cn(
            "flex h-14 w-14 flex-none items-center justify-center rounded-full",
            listening ? "bg-train text-white" : "bg-card text-ink",
          )}
        >
          <Mic size={24} strokeWidth={1.9} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Add a meal photo"
          onClick={() => setMode("photo")}
          className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-card"
        >
          <Camera size={24} strokeWidth={1.9} aria-hidden="true" />
        </button>
        <Button
          big
          onClick={() => void save()}
          disabled={items.length === 0 || busy !== null}
          className="flex-1"
        >
          {copy.log.save}
        </Button>
      </div>

      {editing !== null && items[editing] ? (
        <EditSheet
          item={items[editing]}
          onClose={() => setEditing(null)}
          onSave={(next) => {
            updateItem(editing, next);
            setEditing(null);
          }}
          onRemove={() => {
            setItems((prev) => prev.filter((_, i) => i !== editing));
            setEditing(null);
          }}
        />
      ) : null}
    </main>
  );
}

function ItemRow({ it, weightKg }: { it: DraftItem; weightKg: number }) {
  if (it.kind === "food") {
    const low = it.confidence !== null && it.confidence < 0.6;
    return (
      <>
        <div className="min-w-0 flex-1">
          <div className="truncate text-body font-medium">{it.name}</div>
          <div className={cn("text-[clamp(13px,3.8vw,14px)]", low ? "text-warn" : "text-muted")}>
            {it.grams ? `${Math.round(it.grams)} g` : it.quantity ? `${it.quantity}${it.unit ? ` ${it.unit}` : ""}` : "1 portion"}
            {it.basis === "database" ? ", from food table" : it.basis === "saved" ? ", your saved food" : it.basis === "estimate" ? ", AI estimate" : ""}
            {low ? `. ${copy.log.check}` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="num text-[clamp(19px,5.9vw,22px)] leading-none">{nf.format(it.kcal)}</div>
          <div className="text-caption text-muted">{Math.round(it.protein_g)} g protein</div>
        </div>
      </>
    );
  }
  if (it.kind === "activity") {
    return (
      <>
        <div className="min-w-0 flex-1">
          <div className="truncate text-body font-medium capitalize">{it.activity_type}</div>
          <div className="text-[clamp(13px,3.8vw,14px)] text-muted">{it.duration_min} min</div>
        </div>
        <div className="text-right">
          <div className="num text-[clamp(19px,5.9vw,22px)] leading-none text-train">
            -{fullBurn(activityKcal(it.activity_type, it.duration_min, weightKg))}
          </div>
          <div className="text-caption text-muted">kcal burned</div>
        </div>
      </>
    );
  }
  const bits = [
    it.weight_kg !== null ? `${it.weight_kg} kg` : null,
    it.waist_cm !== null ? `waist ${it.waist_cm} cm` : null,
    it.neck_cm !== null ? `neck ${it.neck_cm} cm` : null,
  ].filter(Boolean);
  return (
    <div className="min-w-0 flex-1">
      <div className="text-body font-medium">Body</div>
      <div className="text-[clamp(13px,3.8vw,14px)] text-muted">{bits.join(", ")}</div>
    </div>
  );
}

function EditSheet({
  item,
  onClose,
  onSave,
  onRemove,
}: {
  item: DraftItem;
  onClose: () => void;
  onSave: (next: DraftItem) => void;
  onRemove: () => void;
}) {
  const [f, setF] = useState<Record<string, string>>((): Record<string, string> => {
    if (item.kind === "food")
      return {
        name: item.name,
        kcal: String(item.kcal),
        protein: String(item.protein_g),
        quantity: item.quantity === null ? "" : String(item.quantity),
        unit: item.unit ?? "",
        grams: item.grams ? String(Math.round(item.grams)) : "",
      };
    if (item.kind === "activity") return { minutes: String(item.duration_min) };
    return {
      weight: item.weight_kg === null ? "" : String(item.weight_kg),
      waist: item.waist_cm === null ? "" : String(item.waist_cm),
      neck: item.neck_cm === null ? "" : String(item.neck_cm),
    };
  });
  const num = (k: string) => {
    const v = (f[k] ?? "").trim().replace(",", ".");
    return v === "" ? null : Number(v);
  };

  // With a table match, changing grams recomputes the numbers.
  function setGrams(v: string) {
    const g = Number(v.trim().replace(",", "."));
    if (item.kind === "food" && item.per100 && Number.isFinite(g) && g >= 0) {
      setF({
        ...f,
        grams: v,
        kcal: String(Math.round((item.per100.kcal * g) / 100)),
        protein: String(Math.round(((item.per100.protein * g) / 100) * 10) / 10),
      });
    } else setF({ ...f, grams: v });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (item.kind === "food") {
      const kcal = num("kcal");
      const protein = num("protein");
      const qty = num("quantity");
      if (kcal === null || !Number.isFinite(kcal) || (f.name ?? "").trim() === "") return;
      onSave({
        ...item,
        name: (f.name ?? "").trim().slice(0, 80),
        kcal: Math.max(0, Math.min(5000, Math.round(kcal))),
        protein_g: Math.max(0, Math.min(300, protein ?? 0)),
        quantity: qty && qty > 0 ? qty : null,
        unit: (f.unit ?? "").trim() === "" ? null : (f.unit ?? "").trim().slice(0, 16),
        grams: num("grams"),
        confidence: 1,
      });
    } else if (item.kind === "activity") {
      const m = num("minutes");
      if (m === null || !Number.isFinite(m) || m < 1) return;
      onSave({ ...item, duration_min: Math.max(1, Math.min(600, Math.round(m))) });
    } else {
      onSave({
        ...item,
        weight_kg: num("weight"),
        waist_cm: num("waist"),
        neck_cm: num("neck"),
      });
    }
  }

  const field = (k: string, label: string, mode: "text" | "decimal" = "decimal") => (
    <label className="flex flex-col gap-2">
      <span className="text-[clamp(13px,3.8vw,14px)] font-semibold">{label}</span>
      <input
        value={f[k] ?? ""}
        onChange={(e) => setF({ ...f, [k]: e.target.value })}
        inputMode={mode === "decimal" ? "decimal" : undefined}
        className="h-[54px] rounded-ctl border-0 bg-card px-4 text-body"
      />
    </label>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Edit item" className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40">
      <form onSubmit={submit} className="sheet w-full max-w-app rounded-t-hero bg-bg p-6">
        <div className="flex flex-col gap-4">
          {item.kind === "food" ? (
            <>
              {field("name", "Name", "text")}
              <div className="grid grid-cols-2 gap-3">
                {field("kcal", "kcal")}
                {field("protein", "Protein, g")}
                <label className="col-span-2 flex flex-col gap-2">
                  <span className="text-[clamp(13px,3.8vw,14px)] font-semibold">Grams eaten</span>
                  <input
                    value={f.grams ?? ""}
                    onChange={(e) => setGrams(e.target.value)}
                    inputMode="decimal"
                    className="h-[54px] rounded-ctl border-0 bg-card px-4 text-body"
                  />
                </label>
              </div>
            </>
          ) : null}
          {item.kind === "activity" ? field("minutes", "Minutes") : null}
          {item.kind === "body" ? (
            <div className="grid grid-cols-3 gap-3">
              {field("weight", "Weight, kg")}
              {field("waist", "Waist, cm")}
              {field("neck", "Neck, cm")}
            </div>
          ) : null}
        </div>
        <div className="mt-6 flex gap-2">
          <Button variant="secondary" big onClick={onRemove}>
            {copy.log.remove}
          </Button>
          <Button variant="secondary" big onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" big className="flex-1">
            Done
          </Button>
        </div>
      </form>
    </div>
  );
}
