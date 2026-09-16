import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LOCALES, SOURCE_LOCALE, isLocale, localePath } from "@/lib/i18n.ts";

import { Portfolio, loadPortfolio } from "../_components/portfolio.tsx";

export const revalidate = 3600;
// Only the locales below exist; anything else is a 404 rather than a render.
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.filter((locale) => locale !== SOURCE_LOCALE).map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const { profile } = await loadPortfolio(locale);

  return {
    title: profile?.full_name ?? "Portfolio",
    description: profile?.headline ?? undefined,
    robots: { index: true, follow: true },
    alternates: {
      canonical: localePath(locale),
      languages: {
        "x-default": "/",
        ...Object.fromEntries(LOCALES.map((code) => [code, localePath(code)])),
      },
    },
  };
}

export default async function LocalisedPortfolio({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return <Portfolio locale={locale} />;
}
