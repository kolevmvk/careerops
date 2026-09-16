import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SOURCE_LOCALE } from "@/lib/i18n.ts";

import { readPublic } from "@/lib/supabase/public.ts";

export const revalidate = 3600;

async function loadProject(slug: string) {
  return readPublic(
    `project(${slug})`,
    async (supabase) => {
      const { data } = await supabase
        .from("public_facts")
        .select("id, title, slug, body, repo_url, live_url, happened_at")
        .eq("kind", "project")
        .eq("locale", SOURCE_LOCALE)
        .eq("slug", slug)
        .maybeSingle();

      return data;
    },
    null,
  );
}

/**
 * Returns nothing when the database is unreachable. Pages are then generated
 * on demand instead of at build time, which is the right trade: a build that
 * cannot run without a database is a deploy that cannot run without one.
 */
export async function generateStaticParams() {
  return readPublic(
    "project slugs",
    async (supabase) => {
      const { data } = await supabase
        .from("public_facts")
        .select("slug")
        .eq("kind", "project")
        .eq("locale", SOURCE_LOCALE);

      return (data ?? [])
        .filter((row): row is { slug: string } => row.slug !== null)
        .map((row) => ({ slug: row.slug }));
    },
    [] as { slug: string }[],
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await loadProject(slug);

  if (project === null) return {};

  return {
    title: project.title ?? slug,
    description: project.body ?? undefined,
    robots: { index: true, follow: true },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await loadProject(slug);

  if (project === null) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/" className="text-sm text-(--color-accent) underline underline-offset-4">
        Back
      </Link>

      <h1 className="mt-8 text-2xl font-semibold tracking-tight">{project.title}</h1>
      <p className="mt-6 leading-relaxed">{project.body}</p>

      <ul className="mt-8 flex gap-4 text-sm">
        {project.live_url === null ? null : (
          <li>
            <a
              href={project.live_url}
              className="text-(--color-accent) underline underline-offset-4"
            >
              Live
            </a>
          </li>
        )}
        {project.repo_url === null ? null : (
          <li>
            <a
              href={project.repo_url}
              className="text-(--color-accent) underline underline-offset-4"
            >
              Source
            </a>
          </li>
        )}
      </ul>
    </main>
  );
}
