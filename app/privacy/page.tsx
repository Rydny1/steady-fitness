import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { copy } from "@/content/copy";

export const metadata = { title: "Privacy" };

const sections: { title: string; body: string[] }[] = [
  {
    title: "Who runs Steady",
    body: [
      "Steady is a personal fitness app run by its owner, who decides what happens to your data. Contact: rydny01@gmail.com.",
    ],
  },
  {
    title: "What is stored",
    body: [
      "Your email, a password hash, and what you add: logs, food, workouts, weight and body measurements, check-ins, notes and photos.",
      "Health data is the most sensitive kind. You are asked for explicit consent when you create an account, and you can withdraw it at any time by deleting your account.",
    ],
  },
  {
    title: "Where it lives and who handles it",
    body: [
      "The database and photo storage are on Supabase in the EU (Paris). The app runs on Vercel in Frankfurt.",
      "Photos sit in private storage. They open only through links that expire after an hour.",
      "Only you can read your rows. The database enforces this per account.",
    ],
  },
  {
    title: "What goes to Google Gemini",
    body: [
      ...copy.settings.privacyText.filter((t) => t.startsWith("Sent to Gemini") || t.startsWith("Chrome")),
    ],
  },
  {
    title: "Cookies and tracking",
    body: [
      "One session cookie keeps you signed in. There are no analytics, no trackers, no ads and no third-party scripts.",
    ],
  },
  {
    title: "Your rights",
    body: [
      "Export everything as a JSON file and a photo zip, or delete everything including your account, from Profile, then Your data. Deleting removes every row and photo.",
      "For anything else, write to rydny01@gmail.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-app px-6 pb-16">
      <Link
        href="/signup"
        aria-label="Back"
        className="mt-[52px] flex h-11 w-11 items-center justify-center rounded-full bg-card"
      >
        <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
      </Link>
      <h1 className="mt-6 text-title font-bold tracking-[-0.8px]">Privacy</h1>
      <p className="mt-2 text-body text-muted">In plain words. What Steady stores, where, and who can see it.</p>
      {sections.map((s) => (
        <section key={s.title} className="mt-8">
          <h2 className="text-section font-bold tracking-[-0.3px]">{s.title}</h2>
          <div className="mt-2 flex flex-col gap-3 text-body leading-[1.45] text-ink-2">
            {s.body.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
