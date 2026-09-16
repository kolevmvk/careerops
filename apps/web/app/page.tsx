import Link from "next/link";

import { createClient } from "@/lib/supabase/server.ts";

/**
 * SPECIFICATION §11: the dashboard drives the next actions rather than showing
 * decorative analytics. At phase 2 the only honest metrics are how many ads are
 * in the corpus and how many applications have actually left the system.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ count: jobCount }, { count: relevantCount }, { data: opportunities }] =
    await Promise.all([
      supabase.from("jobs").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("relevance", 2),
      supabase
        .from("opportunities")
        .select("id, title, stage, outcome, next_action, next_action_due")
        .order("next_action_due", { ascending: true, nullsFirst: false })
        .limit(10),
    ]);

  const contacted = (opportunities ?? []).filter(
    (opportunity) => opportunity.stage !== "identified" && opportunity.stage !== "researched",
  ).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">CareerOps</h1>
        <Link href="/jobs" className="text-sm text-(--color-accent) underline underline-offset-4">
          Job ads
        </Link>
      </header>

      <section className="mt-8 grid grid-cols-3 gap-3">
        <Stat label="Ads collected" value={jobCount ?? 0} />
        <Stat label="Would apply now" value={relevantCount ?? 0} />
        <Stat label="Contacted" value={contacted} />
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-(--color-ink-muted)">Pipeline</h2>

        {opportunities === null || opportunities.length === 0 ? (
          <p className="mt-3 text-sm text-(--color-ink-muted)">
            Nothing in the pipeline yet. Paste a job ad to start one.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-(--color-border-subtle) rounded-lg border border-(--color-border-subtle)">
            {opportunities.map((opportunity) => (
              <li key={opportunity.id} className="flex items-baseline gap-3 px-4 py-3">
                <span className="flex-1 text-sm">{opportunity.title}</span>
                <span className="text-xs text-(--color-ink-muted)">{opportunity.stage}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-(--color-border-subtle) bg-(--color-surface-raised) px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-(--color-ink-muted)">{label}</div>
    </div>
  );
}
