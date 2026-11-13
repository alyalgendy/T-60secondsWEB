import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "T-60 // Mission Control",
  description:
    "A co-op mission simulator for 1–4 players. Grab what you can in sixty seconds, then keep the crew alive.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
