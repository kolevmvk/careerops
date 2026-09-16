import type { Metadata } from "next";
import type { ReactNode } from "react";

/** The cockpit is private working software and is never indexed. */
export const metadata: Metadata = {
  title: "CareerOps",
  robots: { index: false, follow: false },
};

export default function CockpitLayout({ children }: { children: ReactNode }) {
  return children;
}
