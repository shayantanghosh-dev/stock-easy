import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import { Providers } from "@/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Stock Easy — Pharmacy OS",
    template: "%s · Stock Easy",
  },
  description:
    "FEFO-driven pharmacy inventory, billing, analytics and AI assistant for modern pharmacies.",
};

export const viewport: Viewport = {
  themeColor: "#0f52ba",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-screen bg-surface font-sans text-on-surface antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
