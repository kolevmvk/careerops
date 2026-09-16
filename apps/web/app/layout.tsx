import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

/**
 * Fonts are downloaded at build time and served from our own origin, so the
 * page makes no request to a third party. That is a privacy property before it
 * is a performance one: a visitor should not be announced to Google before
 * they have consented to anything.
 *
 * Both families carry Latin and Cyrillic, which Serbian needs.
 */
const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-mono",
});

// Indexing is decided per route group: the cockpit opts out, the portfolio
// opts in. Setting it here would override both.
export const metadata: Metadata = {
  title: { default: "Portfolio", template: "%s" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0d10" },
    { media: "(prefers-color-scheme: light)", color: "#fbfbfc" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
