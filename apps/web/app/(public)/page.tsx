import type { Metadata } from "next";

import { LOCALES, SOURCE_LOCALE, localePath } from "@/lib/i18n.ts";

import { Portfolio, loadPortfolio } from "./_components/portfolio.tsx";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await loadPortfolio(SOURCE_LOCALE);

  return {
    title: profile?.full_name ?? "Portfolio",
    description: profile?.headline ?? undefined,
    robots: { index: true, follow: true },
    alternates: {
      canonical: "/",
      languages: {
        // x-default points at the source locale: a crawler with no language
        // preference should land on English rather than on a translation.
        "x-default": "/",
        ...Object.fromEntries(LOCALES.map((locale) => [locale, localePath(locale)])),
      },
    },
  };
}

export default function PortfolioHome() {
  return <Portfolio locale={SOURCE_LOCALE} />;
}
