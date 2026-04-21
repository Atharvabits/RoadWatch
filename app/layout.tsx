import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoadWatch Bengaluru — Roadside Intelligence Platform",
  description: "Crowdsourced road health monitoring and emergency assistance for Bengaluru",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0a0a0f] text-[#e2e8f0]">{children}</body>
    </html>
  );
}
