import type { Locale } from "@/lib/i18n.ts";

/**
 * Interface strings only. Career facts are not interface strings: they live in
 * `fact_translations`, carry the same validator obligations as their English
 * source, and are never machine-translated at render time.
 *
 * Each entry is a complete sentence or label. Nothing here is assembled from
 * fragments, because word order differs between these languages.
 */
export interface Messages {
  workHeading: string;
  selectedWorkHeading: string;
  backLink: string;
  liveLink: string;
  sourceLink: string;
  languageLabel: string;
  nothingPublished: string;
  showingSource: string;
}

const MESSAGES: Record<Locale, Messages> = {
  en: {
    workHeading: "Work",
    selectedWorkHeading: "Selected work",
    backLink: "Back",
    liveLink: "Live",
    sourceLink: "Source",
    languageLabel: "Language",
    nothingPublished: "Nothing published yet.",
    showingSource: "Shown in English",
  },
  de: {
    workHeading: "Arbeit",
    selectedWorkHeading: "Ausgewählte Arbeiten",
    backLink: "Zurück",
    liveLink: "Live",
    sourceLink: "Quellcode",
    languageLabel: "Sprache",
    nothingPublished: "Noch nichts veröffentlicht.",
    showingSource: "Auf Englisch angezeigt",
  },
  sr: {
    workHeading: "Rad",
    selectedWorkHeading: "Izabrani radovi",
    backLink: "Nazad",
    liveLink: "Uživo",
    sourceLink: "Izvorni kod",
    languageLabel: "Jezik",
    nothingPublished: "Još ništa nije objavljeno.",
    showingSource: "Prikazano na engleskom",
  },
};

export function messagesFor(locale: Locale): Messages {
  return MESSAGES[locale];
}
