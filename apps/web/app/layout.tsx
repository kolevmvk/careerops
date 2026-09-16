import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

// Indexing is decided per route group: the cockpit opts out, the portfolio
// opts in. Setting it here would override both.
export const metadata: Metadata = {
  title: { default: "Portfolio", template: "%s" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
