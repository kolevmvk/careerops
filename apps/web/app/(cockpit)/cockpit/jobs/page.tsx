import { contentHash, urlHash } from "@careerops/intake";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server.ts";

/**
 * Lane C from SPECIFICATION §7.1: paste, the fallback that always works.
 * Lanes A and B write the same rows through the same normalizer, so an ad
 * pasted here and later pulled from an ATS collides on `content_hash`.
 */
export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; duplicate?: string }>;
}) {
  const { saved, duplicate } = await searchParams;
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, company, title, location, remote_policy, relevance, imported_at, source_kind")
    .order("imported_at", { ascending: false })
    .limit(50);

  async function addJob(formData: FormData) {
    "use server";

    const rawText = String(formData.get("raw_text") ?? "").trim();
    const company = String(formData.get("company") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const sourceUrl = String(formData.get("source_url") ?? "").trim();

    if (rawText === "" || company === "" || title === "") {
      redirect("/cockpit/jobs");
    }

    const supabaseAction = await createClient();
    const {
      data: { user },
    } = await supabaseAction.auth.getUser();

    if (user === null) redirect("/login");

    const { error } = await supabaseAction.from("jobs").insert({
      user_id: user.id,
      company,
      title,
      location: emptyToNull(String(formData.get("location") ?? "")),
      raw_text: rawText,
      source_url: emptyToNull(sourceUrl),
      source_kind: "paste",
      content_hash: contentHash(rawText),
      url_hash: urlHash(sourceUrl),
      relevance: Number(formData.get("relevance") ?? 1),
    });

    // The unique constraint on (user_id, content_hash) is the dedupe, so a
    // second paste of the same ad is reported rather than silently stored.
    if (error?.code === "23505") {
      redirect("/cockpit/jobs?duplicate=1");
    }

    if (error !== null) {
      throw new Error(error.message);
    }

    revalidatePath("/cockpit/jobs");
    redirect("/cockpit/jobs?saved=1");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Job ads</h1>
        <Link
          href="/cockpit"
          className="text-sm text-(--color-accent) underline underline-offset-4"
        >
          Dashboard
        </Link>
      </header>

      <form
        action={addJob}
        className="mt-8 flex flex-col gap-4 rounded-lg border border-(--color-border-subtle) bg-(--color-surface-raised) p-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="company" label="Company" required />
          <Field name="title" label="Title" required />
          <Field name="location" label="Location" />
          <Field name="source_url" label="Source URL" type="url" />
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">
            Full ad text
            <span className="ml-2 font-normal text-(--color-ink-muted)">
              paste all of it; the parser needs the original
            </span>
          </span>
          <textarea
            name="raw_text"
            required
            rows={8}
            className="rounded-md border border-(--color-border-subtle) bg-(--color-surface) px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
          />
        </label>

        <div className="flex items-end justify-between gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Relevance</span>
            <select
              name="relevance"
              defaultValue="1"
              className="rounded-md border border-(--color-border-subtle) bg-(--color-surface) px-3 py-2 text-sm"
            >
              <option value="0">0 — noise</option>
              <option value="1">1 — relevant</option>
              <option value="2">2 — would apply now</option>
            </select>
          </label>

          <button
            type="submit"
            className="rounded-md bg-(--color-accent) px-3 py-2 text-sm font-medium text-white"
          >
            Save ad
          </button>
        </div>

        {duplicate !== undefined ? (
          <p role="status" className="text-sm text-(--color-ink-muted)">
            Already in the corpus — same ad, different delivery.
          </p>
        ) : null}
        {saved !== undefined ? (
          <p role="status" className="text-sm text-(--color-good)">
            Saved.
          </p>
        ) : null}
      </form>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-(--color-ink-muted)">
          Corpus ({jobs?.length ?? 0})
        </h2>

        {jobs === null || jobs.length === 0 ? (
          <p className="mt-3 text-sm text-(--color-ink-muted)">Nothing collected yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-(--color-border-subtle) rounded-lg border border-(--color-border-subtle)">
            {jobs.map((job) => (
              <li key={job.id} className="flex items-baseline gap-3 px-4 py-3">
                <span className="text-sm font-medium">{job.company}</span>
                <span className="flex-1 text-sm text-(--color-ink-muted)">{job.title}</span>
                {job.relevance === 2 ? (
                  <span className="text-xs text-(--color-good)">would apply</span>
                ) : null}
                <span className="text-xs text-(--color-ink-muted)">{job.remote_policy}</span>
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

function Field({
  name,
  label,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        className="rounded-md border border-(--color-border-subtle) bg-(--color-surface) px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
      />
    </label>
  );
}
