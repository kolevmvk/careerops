import type { Metadata } from "next";
import Link from "next/link";

import { createPublicClient } from "@/lib/supabase/public.ts";

// Rebuilt on a schedule rather than per request: the content changes when the
// owner publishes a fact, not when a visitor arrives.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const profile = await loadProfile();

  if (profile === null) return { title: "Portfolio" };

  return {
    title: `${profile.full_name ?? "Portfolio"}`,
    description: profile.headline ?? undefined,
    robots: { index: true, follow: true },
  };
}

async function loadProfile() {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("public_profiles")
    .select("public_slug, full_name, headline, summary, location")
    .limit(1)
    .maybeSingle();

  return data;
}

export default async function PortfolioPage() {
  const supabase = createPublicClient();
  const profile = await loadProfile();

  const { data: facts } = await supabase
    .from("public_facts")
    .select("id, kind, title, slug, body, repo_url, live_url, happened_at")
    .order("happened_at", { ascending: false });

  if (profile === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24">
        <p className="text-sm text-(--color-ink-muted)">
          Nothing published yet. A profile becomes public when it is given a slug.
        </p>
      </main>
    );
  }

  const projects = (facts ?? []).filter((fact) => fact.kind === "project");
  const highlights = (facts ?? []).filter((fact) => fact.kind === "highlight");

  // JSON-LD is the machine-readable half of the same facts (SPECIFICATION §13).
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
      ...(project.repo_url === null ? {} : { codeRepository: project.repo_url }),
      ...(project.live_url === null ? {} : { url: project.live_url }),
    })),
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{profile.full_name}</h1>
        {profile.headline === null ? null : (
          <p className="mt-2 text-lg text-(--color-ink-muted)">{profile.headline}</p>
        )}
        {profile.summary === null ? null : (
          <p className="mt-6 leading-relaxed">{profile.summary}</p>
        )}
      </header>

      {projects.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-sm font-medium tracking-wide text-(--color-ink-muted) uppercase">
            Work
          </h2>
          <ul className="mt-5 flex flex-col gap-6">
            {projects.map((project) => (
              <li key={project.id}>
                <h3 className="font-medium">
                  {project.slug === null ? (
                    project.title
                  ) : (
                    <Link
                      href={`/projects/${project.slug}`}
                      className="text-(--color-accent) underline underline-offset-4"
                    >
                      {project.title}
                    </Link>
                  )}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-(--color-ink-muted)">
                  {project.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {highlights.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-sm font-medium tracking-wide text-(--color-ink-muted) uppercase">
            Selected work
          </h2>
          <ul className="mt-5 flex flex-col gap-3">
            {highlights.map((highlight) => (
              <li key={highlight.id} className="text-sm leading-relaxed">
                {highlight.body}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
