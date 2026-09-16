import Link from "next/link";

import { LOCALES, LOCALE_NAMES, localePath, type Locale } from "@/lib/i18n.ts";
import { readPublic } from "@/lib/supabase/public.ts";

import { messagesFor } from "../_lib/messages.ts";
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

/**
 * Composition, mobile first.
 *
 * The reader decides in about fifteen seconds, usually on a phone. So the
 * order is: who this is, then proof they can touch, then the work. Motion is
 * one opening gesture and a single reveal per section - entrances are earned
 * once and nothing re-animates on scroll-back.
 */
export async function Portfolio({ locale }: { locale: Locale }) {
  const t = messagesFor(locale);
  const { profile, facts } = await loadPortfolio(locale);

  if (profile === null) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24">
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

  return (
    // `lang` belongs on <html>, which lives in the root layout and cannot see
    // this route's locale without moving every route under a [locale] segment.
    // Assistive technology reads the nearest `lang`, so the text is announced
    // correctly; the document default stays English.
    <main lang={locale} className="mx-auto max-w-2xl px-5 pt-20 pb-28 sm:px-6 sm:pt-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="rise">
        <h1 className="text-3xl leading-[1.08] font-semibold sm:text-4xl">{profile.full_name}</h1>

        {profile.headline === null ? null : (
          <p className="mt-4 text-lg leading-snug text-(--color-ink-muted) sm:text-xl">
            {profile.headline}
          </p>
        )}

        <div className="rule mt-8" />

        {profile.summary === null ? null : <p className="mt-8 leading-[1.7]">{profile.summary}</p>}
      </header>

      <SyncDemo strings={t.demo} />

      {projects.length > 0 ? (
        <section className="reveal mt-28">
          <h2 className="font-mono text-xs tracking-widest text-(--color-ink-muted) uppercase">
            {t.workHeading}
          </h2>

          <ul className="mt-6 flex flex-col">
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

                <p className="mt-2 leading-relaxed text-(--color-ink-muted)">{project.body}</p>

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
        </section>
      ) : null}

      {highlights.length > 0 ? (
        <section className="reveal mt-28">
          <h2 className="font-mono text-xs tracking-widest text-(--color-ink-muted) uppercase">
            {t.selectedWorkHeading}
          </h2>

          <ul className="mt-6 flex flex-col gap-4">
            {highlights.map((highlight) => (
              <li key={highlight.id} className="flex gap-4 leading-relaxed">
                <span aria-hidden className="mt-2.5 h-px w-5 shrink-0 bg-(--color-border-strong)" />
                <span>{highlight.body}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="reveal-soft mt-28">
        <div className="rule" />
        <nav aria-label={t.languageLabel} className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
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
