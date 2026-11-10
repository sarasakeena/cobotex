import type { Metadata } from "next";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRISISPULSE | Emergency Response & Incident Monitoring",
  description:
    "Real-time emergency incident reporting, automated triage, and disaster response monitoring platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-cream text-navy antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate/30 bg-cardBg py-6 text-center text-xs text-navy/70">
          <div className="max-w-7xl mx-auto px-4">
            <p className="font-medium">
              CRISISPULSE Emergency Response Platform &bull; Round 1: Emergency Incident Reporting &amp; Monitoring
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
