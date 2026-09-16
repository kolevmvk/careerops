import { assemble, renderMarkdown, validateSections } from "@careerops/documents";
import type { Route } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loadFacts } from "@/lib/facts.ts";
import { createClient } from "@/lib/supabase/server.ts";

/**
 * SPECIFICATION §6.4. A document is assembled from verified facts, validated
 * against its own sources, and frozen when it is sent.
 */
export default async function DocumentsPage() {
  const supabase = await createClient();

  const [{ data: documents }, { data: jobs }, facts] = await Promise.all([
    supabase
      .from("documents")
      .select("id, kind, title, created_at, document_versions(id, version, status)")
      .order("created_at", { ascending: false }),
    supabase.from("jobs").select("id, company, title").order("imported_at", { ascending: false }),
    loadFacts(),
  ]);

  const preview = assemble({ kind: "cv", facts });
  const violations = validateSections({ sections: preview.sections, facts, kind: "cv" });

  async function generateCv(formData: FormData) {
    "use server";

    const supabaseAction = await createClient();
    const {
      data: { user },
    } = await supabaseAction.auth.getUser();
    if (user === null) redirect("/login");

    const jobId = emptyToNull(String(formData.get("job_id") ?? ""));
    const currentFacts = await loadFacts();
    const assembled = assemble({ kind: "cv", facts: currentFacts });

    // The validator runs before anything is written. A document that cannot
    // pass is not worth storing, and storing it invites sending it later.
    const problems = validateSections({
      sections: assembled.sections,
      facts: currentFacts,
      kind: "cv",
    });

    if (problems.length > 0 || assembled.sections.length === 0) {
      // typedRoutes models paths, not query strings, so the cast is required.
      redirect("/cockpit/documents?blocked=1" as Route);
    }

    const title = String(formData.get("title") ?? "CV").trim();

    const { data: created, error: documentError } = await supabaseAction
      .from("documents")
      .insert({ user_id: user.id, kind: "cv", title, job_id: jobId })
      .select("id")
      .single();

    if (documentError !== null || created === null) {
      throw new Error(documentError?.message ?? "could not create the document");
    }

    const { data: version, error: versionError } = await supabaseAction
      .from("document_versions")
      .insert({
        user_id: user.id,
        document_id: created.id,
        version: 1,
        rendered_md: renderMarkdown(assembled, title),
        generator: "template",
        content: JSON.parse(JSON.stringify({ sections: assembled.sections })),
      })
      .select("id")
      .single();

    if (versionError !== null || version === null) {
      throw new Error(versionError?.message ?? "could not create the version");
    }

    // Source rows are what make each sentence traceable, and the I4 trigger
    // checks them again on insert.
    const sources = assembled.sections.flatMap((section) =>
      section.sourceIds
        .filter((id) => currentFacts.find((fact) => fact.id === id)?.kind !== "employment")
        .map((id) => ({
          user_id: user.id,
          document_version_id: version.id,
          section: section.section,
          ...columnForFact(currentFacts.find((fact) => fact.id === id)?.kind, id),
        })),
    );

    if (sources.length > 0) {
      const { error: sourceError } = await supabaseAction.from("document_sources").insert(sources);
      if (sourceError !== null) throw new Error(sourceError.message);
    }

    revalidatePath("/cockpit/documents");
    redirect("/cockpit/documents");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <Link
          href="/cockpit"
          className="text-sm text-(--color-accent) underline underline-offset-4"
        >
          Dashboard
        </Link>
      </header>

      <section className="mt-8 rounded-lg border border-(--color-border-subtle) bg-(--color-surface-raised) p-4">
        <h2 className="text-sm font-medium">Generate a CV</h2>
        <p className="mt-1 text-xs text-(--color-ink-muted)">
          Built from verified facts only. {preview.sections.length} section(s),{" "}
          {preview.excluded.length} fact(s) excluded.
        </p>

        {violations.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1">
            {violations.map((violation, index) => (
              <li key={index} className="text-xs text-(--color-danger)">
                {violation.section}: {violation.message}
              </li>
            ))}
          </ul>
        ) : null}

        {preview.excluded.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1">
            {preview.excluded.map((item) => (
              <li key={item.id} className="text-xs text-(--color-ink-muted)">
                excluded ({item.reason}): {item.id}
              </li>
            ))}
          </ul>
        ) : null}

        <form action={generateCv} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Title</span>
            <input
              name="title"
              defaultValue="CV"
              className="rounded-md border border-(--color-border-subtle) bg-(--color-surface) px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">For job (optional)</span>
            <select
              name="job_id"
              defaultValue=""
              className="rounded-md border border-(--color-border-subtle) bg-(--color-surface) px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {(jobs ?? []).map((job) => (
                <option key={job.id} value={job.id}>
                  {job.company} — {job.title}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={violations.length > 0 || preview.sections.length === 0}
            className="rounded-md bg-(--color-accent) px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Generate
          </button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-(--color-ink-muted)">
          Generated ({documents?.length ?? 0})
        </h2>

        {documents === null || documents.length === 0 ? (
          <p className="mt-3 text-sm text-(--color-ink-muted)">Nothing generated yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-(--color-border-subtle) rounded-lg border border-(--color-border-subtle)">
            {documents.map((document) => (
              <li key={document.id} className="flex items-baseline gap-3 px-4 py-3">
                <span className="flex-1 text-sm">{document.title}</span>
                <span className="text-xs text-(--color-ink-muted)">{document.kind}</span>
                <span className="text-xs text-(--color-ink-muted)">
                  {document.document_versions
                    .map((version) => `v${version.version} ${version.status}`)
                    .join(", ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function columnForFact(kind: string | undefined, id: string) {
  if (kind === "project") return { project_id: id };
  return { employment_highlight_id: id };
}
