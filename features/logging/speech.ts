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
  r.continuous = true;
  return r;
}

/** Joins final and interim results into one string. */
export function collectTranscript(e: RecognitionEvent): { final: string; interim: string } {
  let final = "";
  let interim = "";
  for (let i = 0; i < e.results.length; i++) {
    const r = e.results[i];
    if (!r) continue;
    if (r.isFinal) final += r[0].transcript;
    else interim += r[0].transcript;
  }
  return { final: final.trim(), interim: interim.trim() };
}
