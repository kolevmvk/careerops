import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server.ts";

/**
 * Career history is the canonical record every CV guardrail leans on
 * (DOMAIN §4.1). A highlight is not usable as a document source until it is
 * verified (I5), so verifying is a deliberate action here rather than a default.
 */
export default async function HistoryPage() {
  const supabase = await createClient();

  const [{ data: employments }, { data: highlights }] = await Promise.all([
    supabase
      .from("employments")
      .select("id, organization, title, employment_type, start_date, end_date, visibility")
      .order("start_date", { ascending: false }),
    supabase
      .from("employment_highlights")
      .select("id, employment_id, text, visibility, verified_at, sort_order")
      .order("sort_order"),
  ]);

  async function addEmployment(formData: FormData) {
    "use server";
    const supabaseAction = await createClient();
    const {
      data: { user },
    } = await supabaseAction.auth.getUser();
    if (user === null) redirect("/login");

    const { error } = await supabaseAction.from("employments").insert({
      user_id: user.id,
      organization: String(formData.get("organization") ?? "").trim(),
      title: String(formData.get("title") ?? "").trim(),
      employment_type: String(formData.get("employment_type") ?? "full_time") as "full_time",
      start_date: String(formData.get("start_date") ?? ""),
      end_date: emptyToNull(String(formData.get("end_date") ?? "")),
      visibility: "cv_safe",
    });

    if (error !== null) throw new Error(error.message);
    revalidatePath("/history");
  }

  async function addHighlight(formData: FormData) {
    "use server";
    const supabaseAction = await createClient();
    const {
      data: { user },
    } = await supabaseAction.auth.getUser();
    if (user === null) redirect("/login");

    const { error } = await supabaseAction.from("employment_highlights").insert({
      user_id: user.id,
      employment_id: String(formData.get("employment_id") ?? ""),
      text: String(formData.get("text") ?? "").trim(),
      visibility: "cv_safe",
    });

    if (error !== null) throw new Error(error.message);
    revalidatePath("/history");
  }

  async function verifyHighlight(formData: FormData) {
    "use server";
    const supabaseAction = await createClient();

    const { error } = await supabaseAction
      .from("employment_highlights")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", String(formData.get("id") ?? ""));

    if (error !== null) throw new Error(error.message);
    revalidatePath("/history");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Career history</h1>
        <Link href="/" className="text-sm text-(--color-accent) underline underline-offset-4">
          Dashboard
        </Link>
      </header>

      <form
        action={addEmployment}
        className="mt-8 grid gap-4 rounded-lg border border-(--color-border-subtle) bg-(--color-surface-raised) p-4 sm:grid-cols-2"
      >
        <Field name="organization" label="Organization" required />
        <Field name="title" label="Title" required />
        <Field name="start_date" label="Start" type="date" required />
        <Field name="end_date" label="End (blank if current)" type="date" />
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-(--color-accent) px-3 py-2 text-sm font-medium text-white"
          >
            Add employment
          </button>
        </div>
      </form>

      <section className="mt-10 flex flex-col gap-6">
        {(employments ?? []).map((employment) => {
          const own = (highlights ?? []).filter((h) => h.employment_id === employment.id);

          return (
            <article
              key={employment.id}
              className="rounded-lg border border-(--color-border-subtle) p-4"
            >
              <h2 className="text-sm font-semibold">
                {employment.title}
                <span className="font-normal text-(--color-ink-muted)">
                  {" · "}
                  {employment.organization}
                </span>
              </h2>
              <p className="mt-0.5 text-xs text-(--color-ink-muted)">
                {employment.start_date} — {employment.end_date ?? "present"}
              </p>

              <ul className="mt-3 flex flex-col gap-2">
                {own.map((highlight) => (
                  <li key={highlight.id} className="flex items-start gap-3 text-sm">
                    <span className="flex-1">{highlight.text}</span>
                    {highlight.verified_at === null ? (
                      <form action={verifyHighlight}>
                        <input type="hidden" name="id" value={highlight.id} />
                        <button
                          type="submit"
                          className="rounded border border-(--color-border-subtle) px-2 py-0.5 text-xs"
                        >
                          Verify
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-(--color-good)">verified</span>
                    )}
                  </li>
                ))}
                {own.length === 0 ? (
                  <li className="text-sm text-(--color-ink-muted)">No highlights yet.</li>
                ) : null}
              </ul>

              <form action={addHighlight} className="mt-3 flex gap-2">
                <input type="hidden" name="employment_id" value={employment.id} />
                <input
                  name="text"
                  required
                  placeholder="One claim, written at the level it may be shown"
                  className="flex-1 rounded-md border border-(--color-border-subtle) bg-(--color-surface) px-3 py-1.5 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md border border-(--color-border-subtle) px-3 py-1.5 text-sm"
                >
                  Add
                </button>
              </form>
            </article>
          );
        })}

        {(employments ?? []).length === 0 ? (
          <p className="text-sm text-(--color-ink-muted)">
            No employments yet. A CV cannot be generated without them.
          </p>
        ) : null}
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
