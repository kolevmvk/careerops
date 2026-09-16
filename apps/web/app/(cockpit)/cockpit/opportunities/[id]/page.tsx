import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server.ts";
import type { Database } from "@/lib/database.types.ts";

type Stage = Database["careerops"]["Enums"]["opportunity_stage"];
type Outcome = Database["careerops"]["Enums"]["opportunity_outcome"];

const STAGES: Stage[] = [
  "identified",
  "researched",
  "contacted",
  "conversation",
  "evaluation",
  "negotiation",
  "closed",
];

const OUTCOMES: Outcome[] = [
  "open",
  "won",
  "declined_by_me",
  "rejected",
  "withdrawn",
  "no_response",
  "parked",
];

/**
 * Attaching a document version here is the moment an application leaves the
 * system. The I3 trigger freezes the version on insert, so what was sent stays
 * exactly as it was sent — the app does not have to remember to do it.
 */
export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: opportunity }, { data: events }, { data: attached }, { data: versions }] =
    await Promise.all([
      supabase
        .from("opportunities")
        .select("id, title, track, origin, stage, outcome, next_action, next_action_due")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("opportunity_events")
        .select("id, type, from_stage, to_stage, occurred_at, note")
        .eq("opportunity_id", id)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("opportunity_documents")
        .select("id, role, sent_at, document_versions(id, version, status, documents(title))")
        .eq("opportunity_id", id),
      supabase
        .from("document_versions")
        .select("id, version, status, documents(id, title, kind)")
        .order("created_at", { ascending: false }),
    ]);

  if (opportunity === null) notFound();

  async function updateStage(formData: FormData) {
    "use server";
    const supabaseAction = await createClient();

    // The stage-change trigger writes the event; nothing here records it.
    const { error } = await supabaseAction
      .from("opportunities")
      .update({
        stage: String(formData.get("stage") ?? "identified") as Stage,
        outcome: String(formData.get("outcome") ?? "open") as Outcome,
      })
      .eq("id", id);

    if (error !== null) throw new Error(error.message);
    revalidatePath(`/cockpit/opportunities/${id}`);
  }

  async function attachDocument(formData: FormData) {
    "use server";
    const supabaseAction = await createClient();
    const {
      data: { user },
    } = await supabaseAction.auth.getUser();
    if (user === null) redirect("/login");

    const { error } = await supabaseAction.from("opportunity_documents").insert({
      user_id: user.id,
      opportunity_id: id,
      document_version_id: String(formData.get("document_version_id") ?? ""),
      role: "cv",
    });

    if (error !== null) throw new Error(error.message);
    revalidatePath(`/cockpit/opportunities/${id}`);
  }

  async function addNote(formData: FormData) {
    "use server";
    const supabaseAction = await createClient();
    const {
      data: { user },
    } = await supabaseAction.auth.getUser();
    if (user === null) redirect("/login");

    const note = String(formData.get("note") ?? "").trim();
    if (note === "") return;

    const { error } = await supabaseAction.from("opportunity_events").insert({
      user_id: user.id,
      opportunity_id: id,
      type: String(formData.get("type") ?? "note") as "note",
      note,
    });

    if (error !== null) throw new Error(error.message);
    revalidatePath(`/cockpit/opportunities/${id}`);
  }

  const attachedIds = new Set((attached ?? []).map((row) => row.document_versions?.id));

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{opportunity.title}</h1>
        <Link
          href="/cockpit/opportunities"
          className="text-sm text-(--color-accent) underline underline-offset-4"
        >
          Pipeline
        </Link>
      </header>

      <form
        action={updateStage}
        className="mt-8 flex flex-wrap items-end gap-3 rounded-lg border border-(--color-border-subtle) bg-(--color-surface-raised) p-4"
      >
        <Select name="stage" label="Stage" options={STAGES} value={opportunity.stage} />
        <Select name="outcome" label="Outcome" options={OUTCOMES} value={opportunity.outcome} />
        <button
          type="submit"
          className="rounded-md bg-(--color-accent) px-3 py-2 text-sm font-medium text-white"
        >
          Update
        </button>
      </form>

      <section className="mt-8">
        <h2 className="text-sm font-medium">Documents sent</h2>
        <p className="mt-1 text-xs text-(--color-ink-muted)">
          Attaching freezes the version. What was sent stays as it was sent.
        </p>

        <ul className="mt-3 flex flex-col gap-1">
          {(attached ?? []).map((row) => (
            <li key={row.id} className="text-sm">
              {row.document_versions?.documents?.title} · v{row.document_versions?.version} ·{" "}
              <span className="text-(--color-good)">{row.document_versions?.status}</span>
            </li>
          ))}
          {(attached ?? []).length === 0 ? (
            <li className="text-sm text-(--color-ink-muted)">Nothing sent yet.</li>
          ) : null}
        </ul>

        <form action={attachDocument} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-1 flex-col gap-1.5 text-sm">
            <span className="font-medium">Attach a document</span>
            <select
              name="document_version_id"
              required
              defaultValue=""
              className="rounded-md border border-(--color-border-subtle) bg-(--color-surface) px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Pick a version
              </option>
              {(versions ?? [])
                .filter((version) => !attachedIds.has(version.id))
                .map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.documents?.title} · v{version.version} · {version.status}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md border border-(--color-border-subtle) px-3 py-2 text-sm"
          >
            Attach and freeze
          </button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium">Events</h2>

        <form action={addNote} className="mt-3 flex flex-wrap gap-2">
          <select
            name="type"
            defaultValue="note"
            className="rounded-md border border-(--color-border-subtle) bg-(--color-surface) px-3 py-1.5 text-sm"
          >
            {["note", "message_sent", "message_received", "call", "interview", "offer"].map(
              (type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ),
            )}
          </select>
          <input
            name="note"
            required
            placeholder="What happened"
            className="flex-1 rounded-md border border-(--color-border-subtle) bg-(--color-surface) px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-md border border-(--color-border-subtle) px-3 py-1.5 text-sm"
          >
            Record
          </button>
        </form>

        <ul className="mt-4 flex flex-col gap-2">
          {(events ?? []).map((event) => (
            <li key={event.id} className="flex items-baseline gap-3 text-sm">
              <span className="w-36 shrink-0 text-xs text-(--color-ink-muted)">
                {new Date(event.occurred_at).toLocaleString()}
              </span>
              <span className="font-medium">{event.type}</span>
              <span className="flex-1 text-(--color-ink-muted)">
                {event.type === "stage_change"
                  ? `${event.from_stage ?? "—"} → ${event.to_stage ?? "—"}`
                  : (event.note ?? "")}
              </span>
            </li>
          ))}
          {(events ?? []).length === 0 ? (
            <li className="text-sm text-(--color-ink-muted)">No events recorded.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}

function Select({
  name,
  label,
  options,
  value,
}: {
  name: string;
  label: string;
  options: readonly string[];
  value: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="rounded-md border border-(--color-border-subtle) bg-(--color-surface) px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
