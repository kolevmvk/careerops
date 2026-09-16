import Link from "next/link";

import { LOCALES, LOCALE_NAMES, localePath, type Locale } from "@/lib/i18n.ts";
import { readPublic } from "@/lib/supabase/public.ts";

import { messagesFor } from "../_lib/messages.ts";

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

export async function Portfolio({ locale }: { locale: Locale }) {
  const t = messagesFor(locale);
  const { profile, facts } = await loadPortfolio(locale);

  if (profile === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24">
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
    // Declaring it on the content container is valid and is what assistive
    // technology reads for this text, but the document default stays English.
    // Worth revisiting if the cockpit ever moves under a locale segment too.
    <main lang={locale} className="mx-auto max-w-2xl px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{profile.full_name}</h1>
        {profile.headline === null ? null : (
          <p className="mt-2 text-lg text-pretty text-(--color-ink-muted)">{profile.headline}</p>
        )}
        {profile.summary === null ? null : (
          <p className="mt-6 leading-relaxed text-pretty">{profile.summary}</p>
        )}
      </header>

      {projects.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-sm font-medium tracking-wide text-(--color-ink-muted) uppercase">
            {t.workHeading}
          </h2>
          <ul className="mt-5 flex flex-col gap-6">
            {projects.map((project) => (
              <li key={project.id}>
                <h3 className="font-medium">
                  {project.slug === null ? (
                    project.title
                  ) : (
                    <Link
                      href={localePath(locale, `/projects/${project.slug}`)}
                      className="text-(--color-accent) underline underline-offset-4"
                    >
                      {project.title}
                    </Link>
                  )}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-pretty text-(--color-ink-muted)">
                  {project.body}
                </p>
                {project.is_fallback ? (
                  <p className="mt-1 text-xs text-(--color-ink-muted)">{t.showingSource}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {highlights.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-sm font-medium tracking-wide text-(--color-ink-muted) uppercase">
            {t.selectedWorkHeading}
          </h2>
          <ul className="mt-5 flex flex-col gap-3">
            {highlights.map((highlight) => (
              <li key={highlight.id} className="text-sm leading-relaxed text-pretty">
                {highlight.body}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <LocaleSwitcher current={locale} label={t.languageLabel} />
    </main>
  );
}

/**
 * Plain links, so switching works without JavaScript and each destination is a
 * real cacheable URL. The cookie that remembers the choice is set by the
 * destination page, not here.
 */
function LocaleSwitcher({ current, label }: { current: Locale; label: string }) {
  return (
    <nav aria-label={label} className="mt-20 flex gap-4 text-xs">
      {LOCALES.map((locale) =>
        locale === current ? (
          <span key={locale} aria-current="true" className="text-(--color-ink)">
            {LOCALE_NAMES[locale]}
          </span>
        ) : (
          <Link
            key={locale}
            href={localePath(locale)}
            hrefLang={locale}
            className="text-(--color-ink-muted) underline underline-offset-4"
          >
            {LOCALE_NAMES[locale]}
          </Link>
        ),
      )}
    </nav>
  );
}
