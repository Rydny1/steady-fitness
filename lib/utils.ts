import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** First letter in capitals, rest untouched. Sentence case, never all caps. */
export function capitalize(s: string): string {
  return s.slice(0, 1).toLocaleUpperCase("en") + s.slice(1);
}
