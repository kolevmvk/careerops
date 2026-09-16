import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server.ts";

/**
 * SPECIFICATION §6.2 and §6.3: one pipeline for ads and outreach. Stage and
 * outcome are separate, because a rejection can happen at any stage and the
 * stage it happened at is what the funnel needs (DOMAIN §4.8).
 */
export default async function OpportunitiesPage() {
  const supabase = await createClient();

  const [{ data: opportunities }, { data: jobs }] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id, title, track, origin, stage, outcome, expected_comp, comp_currency, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("jobs").select("id, company, title").order("imported_at", { ascending: false }),
  ]);

  async function createFromJob(formData: FormData) {
    "use server";

    const supabaseAction = await createClient();
    const {
      data: { user },
    } = await supabaseAction.auth.getUser();
    if (user === null) redirect("/login");

    const jobId = String(formData.get("job_id") ?? "");

    const { data: job } = await supabaseAction
      .from("jobs")
      .select("company, title, remote_policy")
      .eq("id", jobId)
      .single();

    if (job === null) redirect("/opportunities");

    const { error } = await supabaseAction.from("opportunities").insert({
      user_id: user.id,
      track: "contract",
      origin: "job_ad",
      job_id: jobId,
      title: `${job.company} — ${job.title}`,
      remote_policy: job.remote_policy,
      stage: "identified",
    });

    if (error !== null) throw new Error(error.message);

    revalidatePath("/opportunities");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
        <Link href="/" className="text-sm text-(--color-accent) underline underline-offset-4">
          Dashboard
        </Link>
      </header>

      <form
        action={createFromJob}
        className="mt-8 flex flex-wrap items-end gap-3 rounded-lg border border-(--color-border-subtle) bg-(--color-surface-raised) p-4"
      >
        <label className="flex flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium">Start from a job ad</span>
          <select
            name="job_id"
            required
            defaultValue=""
            className="rounded-md border border-(--color-border-subtle) bg-(--color-surface) px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Pick an ad
            </option>
            {(jobs ?? []).map((job) => (
              <option key={job.id} value={job.id}>
                {job.company} — {job.title}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="rounded-md bg-(--color-accent) px-3 py-2 text-sm font-medium text-white"
        >
          Add to pipeline
        </button>
      </form>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-(--color-ink-muted)">
          Pipeline ({opportunities?.length ?? 0})
        </h2>

        {opportunities === null || opportunities.length === 0 ? (
          <p className="mt-3 text-sm text-(--color-ink-muted)">
            Nothing yet. Collect an ad first, then start an opportunity from it.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-(--color-border-subtle) rounded-lg border border-(--color-border-subtle)">
            {opportunities.map((opportunity) => (
              <li key={opportunity.id} className="flex items-baseline gap-3 px-4 py-3">
                <Link
                  href={`/opportunities/${opportunity.id}`}
                  className="flex-1 text-sm text-(--color-accent) underline underline-offset-4"
                >
                  {opportunity.title}
                </Link>
                <span className="text-xs text-(--color-ink-muted)">{opportunity.stage}</span>
                {opportunity.outcome !== "open" ? (
                  <span className="text-xs text-(--color-ink-muted)">{opportunity.outcome}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
