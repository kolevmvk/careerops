import Link from "next/link";
import type { ReactNode } from "react";

import { LOCALES, LOCALE_NAMES, localePath, type Locale } from "@/lib/i18n.ts";
import { readPublic } from "@/lib/supabase/public.ts";

import { messagesFor, type Messages } from "../_lib/messages.ts";
import { ResilienceMarker } from "./resilience-marker.tsx";
import { Section } from "./section.tsx";
import { SyncDemo } from "./sync-demo.tsx";

export async function loadPortfolio(locale: Locale) {
  return readPublic(
    `portfolio(${locale})`,
    async (supabase) => {
      const [{ data: profile }, { data: facts }] = await Promise.all([
        supabase
          .from("public_profiles")
          .select("public_slug, full_name, headline, summary, location")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("public_facts")
          .select("id, kind, title, slug, body, repo_url, live_url, happened_at, is_fallback")
          .eq("locale", locale)
          .order("happened_at", { ascending: false }),
      ]);

      return { profile, facts: facts ?? [] };
    },
    { profile: null, facts: [] },
  );
}

type PortfolioData = Awaited<ReturnType<typeof loadPortfolio>>;
type Fact = PortfolioData["facts"][number];

/**
 * Composition.
 *
 * The reader decides in about fifteen seconds, usually on a phone, so the
 * order is: who this is, then proof they can touch, then the work. The page
 * borrows the shape of the thing it describes - a sequence down the left, the
 * payload beside it - and it survives losing the network, which is the same
 * claim made at a second level.
 *
 * Motion is one opening gesture and a single reveal per section. Entrances are
 * earned once; nothing re-animates on scroll-back.
 */
export async function Portfolio({ locale }: { locale: Locale }) {
  const t = messagesFor(locale);
  const { profile, facts } = await loadPortfolio(locale);

  if (profile === null) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-24">
        <p className="text-sm text-(--color-ink-muted)">{t.nothingPublished}</p>
      </main>
    );
  }

  const projects = facts.filter((fact) => fact.kind === "project");
  const highlights = facts.filter((fact) => fact.kind === "highlight");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.full_name,
    jobTitle: profile.headline,
    description: profile.summary,
    address: profile.location,
    subjectOf: projects.map((project) => ({
      "@type": "CreativeWork",
      name: project.title,
      abstract: project.body,
      inLanguage: locale,
      ...(project.repo_url === null ? {} : { codeRepository: project.repo_url }),
      ...(project.live_url === null ? {} : { url: project.live_url }),
    })),
  };

  // Numbered by position rather than by a counter mutating inside JSX, so
  // adding or removing a section cannot silently renumber the rest.
  const sections: { key: string; label: string; content: ReactNode }[] = [
    { key: "demo", label: t.demo.eyebrow, content: <SyncDemo strings={t.demo} /> },
  ];

  if (projects.length > 0) {
    sections.push({
      key: "work",
      label: t.workHeading,
      content: <ProjectList projects={projects} locale={locale} t={t} />,
    });
  }

  if (highlights.length > 0) {
    sections.push({
      key: "highlights",
      label: t.selectedWorkHeading,
      content: <HighlightList highlights={highlights} />,
    });
  }

  return (
    // `lang` belongs on <html>, which lives in the root layout and cannot see
    // this route's locale. Assistive technology reads the nearest `lang`, so
    // the text is announced correctly; the document default stays English.
    <main lang={locale} className="mx-auto max-w-3xl px-5 pt-16 pb-28 sm:px-8 sm:pt-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="rise grid gap-x-6 gap-y-4 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
        <div aria-hidden className="hidden sm:block sm:pt-2">
          <span className="font-mono text-xs tabular-nums text-(--color-ink-faint)">00</span>
        </div>

        <div className="min-w-0">
          <h1 className="text-[clamp(1.9rem,6vw,2.9rem)] leading-[1.05] font-semibold">
            {profile.full_name}
          </h1>

          {profile.headline === null ? null : (
            <p className="mt-4 text-[clamp(1.05rem,3.2vw,1.35rem)] leading-snug text-(--color-ink-muted)">
              {profile.headline}
            </p>
          )}

          {profile.summary === null ? null : (
            <p className="mt-7 max-w-prose leading-[1.75]">{profile.summary}</p>
          )}

          <div className="mt-7">
            <ResilienceMarker strings={t.resilience} />
          </div>
        </div>
      </header>

      {sections.map((section, position) => (
        <Section key={section.key} index={position + 1} label={section.label}>
          {section.content}
        </Section>
      ))}

      <footer className="reveal-soft mt-24 grid gap-x-6 gap-y-4 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
        <div aria-hidden className="hidden sm:block" />
        <nav aria-label={t.languageLabel} className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {LOCALES.map((code) =>
            code === locale ? (
              <span key={code} aria-current="true" className="text-(--color-ink)">
                {LOCALE_NAMES[code]}
              </span>
            ) : (
              <Link
                key={code}
                href={localePath(code)}
                hrefLang={code}
                className="text-(--color-ink-faint) transition-colors duration-200 hover:text-(--color-ink)"
              >
                {LOCALE_NAMES[code]}
              </Link>
            ),
          )}
        </nav>
      </footer>
    </main>
  );
}

function ProjectList({ projects, locale, t }: { projects: Fact[]; locale: Locale; t: Messages }) {
  return (
    <ul className="flex flex-col">
      {projects.map((project) => (
        <li
          key={project.id}
          className="border-t border-(--color-border-subtle) py-6 first:border-t-0 first:pt-0"
        >
          <h3 className="text-lg font-medium">
            {project.slug === null ? (
              project.title
            ) : (
              <Link
                href={localePath(locale, `/projects/${project.slug}`)}
                className="underline decoration-(--color-border-strong) underline-offset-4 transition-colors duration-200 hover:text-(--color-accent) hover:decoration-(--color-accent)"
              >
                {project.title}
              </Link>
            )}
          </h3>

          <p className="mt-2 max-w-prose leading-relaxed text-(--color-ink-muted)">
            {project.body}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs">
            {project.live_url === null ? null : (
              <a
                href={project.live_url}
                className="text-(--color-accent) transition-opacity duration-200 hover:opacity-70"
              >
                {t.liveLink} ↗
              </a>
            )}
            {project.repo_url === null ? null : (
              <a
                href={project.repo_url}
                className="text-(--color-accent) transition-opacity duration-200 hover:opacity-70"
              >
                {t.sourceLink} ↗
              </a>
            )}
            {project.is_fallback ? (
              <span className="text-(--color-ink-faint)">{t.showingSource}</span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function HighlightList({ highlights }: { highlights: Fact[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {highlights.map((highlight, position) => (
        <li key={highlight.id} className="flex gap-4 leading-relaxed">
          <span
            aria-hidden
            className="mt-0.5 shrink-0 font-mono text-xs tabular-nums text-(--color-ink-faint)"
          >
            {String(position + 1).padStart(2, "0")}
          </span>
          <span className="max-w-prose">{highlight.body}</span>
        </li>
      ))}
    </ul>
  );
}
