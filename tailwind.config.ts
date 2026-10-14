import type { Config } from "tailwindcss";

// Every colour comes from the tokens in app/globals.css (DESIGN.md > Tokens).
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        card: "var(--card)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        muted: "var(--muted)",
        "muted-dark": "var(--muted-dark)",
        line: "var(--line)",
        fuel: "var(--fuel)",
        "fuel-soft": "var(--fuel-soft)",
        "fuel-ink": "var(--fuel-ink)",
        protein: "var(--protein)",
        train: "var(--train)",
        "train-soft": "var(--train-soft)",
        "ink-line": "var(--ink-line)",
        "ink-faint": "var(--ink-faint)",
        "ink-soft": "var(--ink-soft)",
        dash: "var(--dash)",
        faint: "var(--faint)",
        warn: "var(--warn)",
        amber: "var(--amber)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: ["var(--font-hanken)", "system-ui", "sans-serif"],
        num: ["var(--font-barlow)", "system-ui", "sans-serif"],
      },
      fontSize: {
        nav: ["12px", { lineHeight: "1.3" }],
        caption: ["13px", { lineHeight: "1.35" }],
        small: ["15px", { lineHeight: "1.4" }],
        body: ["17px", { lineHeight: "1.4" }],
        section: ["22px", { lineHeight: "1.2" }],
        sub: ["28px", { lineHeight: "1.15" }],
        title: ["34px", { lineHeight: "1.1" }],
        form: ["56px", { lineHeight: "0.95" }],
        score: ["72px", { lineHeight: "0.95" }],
      },
      borderRadius: {
        hero: "28px",
        list: "24px",
        tile: "20px",
        inner: "18px",
        ctl: "16px",
      },
      maxWidth: { app: "520px" },
    },
  },
  plugins: [],
} satisfies Config;
