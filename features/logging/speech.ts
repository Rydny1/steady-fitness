"use client";

// Web Speech API on the phone (Chrome). Typed text is the fallback when missing.
// Minimal types: lib.dom does not ship SpeechRecognition.

type RecognitionResult = { 0: { transcript: string }; isFinal: boolean };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };

export type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean {
  return ctor() !== null;
}

export function createRecognition(): Recognition | null {
  const C = ctor();
  if (!C) return null;
  const r = new C();
  r.lang = "en-US";
  r.interimResults = true;
  // Android Chrome repeats earlier words in every result when continuous is on. One utterance at a time is clean.
  r.continuous = false;
  return r;
}

/**
 * Joins speech segments without repeats. Phones send growing copies of the same words
 * ("I", "I walked", "I walked 60"): a segment that starts with what we have replaces it,
 * one already contained is dropped, anything else is added after.
 */
export function mergeSegments(segments: readonly string[]): string {
  let out = "";
  for (const raw of segments) {
    const seg = raw.trim();
    if (!seg) continue;
    const a = out.toLowerCase();
    const b = seg.toLowerCase();
    if (!out) out = seg;
    else if (b.startsWith(a)) out = seg;
    else if (a.includes(b)) continue;
    else out = out + " " + seg;
  }
  return collapseRepeats(out);
}

/** "walked 60 minutes walked 60 minutes" becomes "walked 60 minutes". */
export function collapseRepeats(text: string): string {
  const words = text.split(" ").filter((w) => w.length > 0);
  const same = (i: number, j: number, n: number) => {
    for (let k = 0; k < n; k++) {
      if ((words[i + k] ?? "").toLowerCase() !== (words[j + k] ?? "").toLowerCase()) return false;
    }
    return true;
  };
  for (let n = 6; n >= 1; n--) {
    let i = 0;
    while (i + 2 * n <= words.length) {
      if (same(i, i + n, n)) words.splice(i + n, n);
      else i += 1;
    }
  }
  return words.join(" ");
}

/** Final and interim results as clean strings. */
export function collectTranscript(e: RecognitionEvent): { final: string; interim: string } {
  const finals: string[] = [];
  const interims: string[] = [];
  for (let i = 0; i < e.results.length; i++) {
    const r = e.results[i];
    if (!r) continue;
    (r.isFinal ? finals : interims).push(r[0].transcript);
  }
  return { final: mergeSegments(finals), interim: mergeSegments(interims) };
}
