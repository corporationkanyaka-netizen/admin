import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display-face", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono-face", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Kanyaka Desk", template: "%s · Kanyaka Desk" },
  description: "Kanyaka Corporation staff portal — enquiries, customers, quotations and stock.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#071324" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${display.variable} ${mono.variable} h-full`}>
      <body className="min-h-full bg-paper font-sans text-[#0b1626]">{children}</body>
    </html>
  );
}
