import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { DialogGuard } from "@/components/dialog-guard";

// Every page is dynamic: the CSP nonce is set per request in proxy.ts.
export const dynamic = "force-dynamic";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

// Log parsing calls Gemini; the default serverless limit is too short for a model fallback.
export const maxDuration = 60;

export const metadata: Metadata = {
  title: { default: "Steady", template: "%s | Steady" },
  description: "One steady day at a time.",
  applicationName: "Steady",
  appleWebApp: { capable: true, title: "Steady", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${hanken.variable} ${barlow.variable}`}>
      <body>
        {children}
        <DialogGuard />
      </body>
    </html>
  );
}
