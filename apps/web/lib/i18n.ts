/**
 * Locale set and negotiation.
 *
 * Locale is a path segment so every locale is a separately cacheable static
 * page. Negotiation happens once, as a redirect in the proxy, rather than by
 * varying the response - a page that varies per visitor cannot be served from
 * a CDN, which would cost more speed than the detection is worth.
 */

import type { Route } from "next";

export const LOCALES = ["en", "de", "sr"] as const;
export type Locale = (typeof LOCALES)[number];

export const SOURCE_LOCALE: Locale = "en";

/** The default locale lives at `/`; the others carry a prefix. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  sr: "Srpski",
};

/** Remembering an explicit choice is functional, not tracking. */
export const LOCALE_COOKIE = "careerops_locale";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function localePath(locale: Locale, path = ""): Route {
  const suffix = path.startsWith("/") ? path : path === "" ? "" : `/${path}`;
  const full = locale === SOURCE_LOCALE ? suffix || "/" : `/${locale}${suffix}`;
  // typedRoutes cannot model a path assembled at runtime; the locale set and
  // the callers' paths are both closed, so this is checked by construction.
  return full as Route;
}

/**
 * Parses `Accept-Language` and returns the best supported match.
 *
 * Header quality values are respected, an unsupported language is skipped
 * rather than failing the whole header, and a region tag matches its base
 * language, so `de-AT` picks `de`.
 */
export function negotiateLocale(header: string | null): Locale | null {
  if (header === null || header.trim() === "") return null;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const quality = params
        .map((param) => param.trim())
        .filter((param) => param.startsWith("q="))
        .map((param) => Number.parseFloat(param.slice(2)))
        .find((value) => !Number.isNaN(value));

      return { tag: (tag ?? "").trim().toLowerCase(), quality: quality ?? 1 };
    })
    .filter((entry) => entry.tag !== "" && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    if (tag === "*") return null;

    const base = tag.split("-")[0] ?? tag;
    if (isLocale(base)) return base;
  }

  return null;
}
