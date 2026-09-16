import type { SyncDemoStrings } from "../_components/sync-demo.tsx";
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
  demo: SyncDemoStrings;
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
    demo: {
      eyebrow: "Try it",
      heading: "The problem, running in your browser",
      lede:
        "A worker taps in where there is no signal. They tap twice because nothing happened. " +
        "The operating system kills the app mid-sync. Every event still arrives, once, in order.",
      device: "Device",
      server: "Server",
      goOffline: "Cut the network",
      goOnline: "Restore the network",
      crash: "Kill the app",
      reset: "Reset",
      offlineNote: "Held locally. Nothing is lost while the network is down.",
      emptyQueue: "No events captured yet.",
      emptyServer: "Nothing received.",
      exactlyOnce: "each event recorded once",
      ordered: "received in the order they happened",
      actions: [
        { label: "Shift start", key: "shift-start" },
        { label: "Break", key: "break" },
        { label: "Shift end", key: "shift-end" },
      ],
      hint: "Tap the same action twice, or cut the network first. The invariants hold either way.",
    },
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
    demo: {
      eyebrow: "Ausprobieren",
      heading: "Das Problem, direkt im Browser",
      lede:
        "Eine Mitarbeiterin stempelt ohne Empfang. Sie tippt zweimal, weil nichts passiert. " +
        "Das Betriebssystem beendet die App mitten in der Übertragung. Jedes Ereignis kommt " +
        "trotzdem an, genau einmal, in der richtigen Reihenfolge.",
      device: "Gerät",
      server: "Server",
      goOffline: "Netz trennen",
      goOnline: "Netz wiederherstellen",
      crash: "App beenden",
      reset: "Zurücksetzen",
      offlineNote: "Lokal gespeichert. Ohne Netz geht nichts verloren.",
      emptyQueue: "Noch keine Ereignisse erfasst.",
      emptyServer: "Nichts empfangen.",
      exactlyOnce: "jedes Ereignis genau einmal gespeichert",
      ordered: "in der Reihenfolge des Geschehens empfangen",
      actions: [
        { label: "Schichtbeginn", key: "shift-start" },
        { label: "Pause", key: "break" },
        { label: "Schichtende", key: "shift-end" },
      ],
      hint: "Zweimal dieselbe Aktion tippen oder vorher das Netz trennen. Die Zusicherungen gelten in beiden Fällen.",
    },
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
    demo: {
      eyebrow: "Probaj",
      heading: "Problem, uživo u tvom pregledaču",
      lede:
        "Radnik se prijavljuje tamo gde nema signala. Kucne dvaput jer se ništa nije desilo. " +
        "Operativni sistem ubije aplikaciju usred sinhronizacije. Svaki događaj ipak stigne, " +
        "tačno jednom, po redu.",
      device: "Uređaj",
      server: "Server",
      goOffline: "Prekini mrežu",
      goOnline: "Vrati mrežu",
      crash: "Ubij aplikaciju",
      reset: "Poništi",
      offlineNote: "Sačuvano lokalno. Dok mreže nema, ništa se ne gubi.",
      emptyQueue: "Još nema zabeleženih događaja.",
      emptyServer: "Ništa nije primljeno.",
      exactlyOnce: "svaki događaj zabeležen tačno jednom",
      ordered: "primljeni redom kojim su se desili",
      actions: [
        { label: "Početak smene", key: "shift-start" },
        { label: "Pauza", key: "break" },
        { label: "Kraj smene", key: "shift-end" },
      ],
      hint: "Kucni istu akciju dvaput, ili prvo prekini mrežu. Garancije važe u oba slučaja.",
    },
  },
};

export function messagesFor(locale: Locale): Messages {
  return MESSAGES[locale];
}
