import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { LOCALE_NAMES, isLocale, type Locale } from "@/lib/i18n.ts";
import { createClient } from "@/lib/supabase/server.ts";

/**
 * Approval gate for translated facts.
 *
 * A translation is a claim about the owner's work in a language they may not
 * read fluently, so nothing here publishes on its own. The database enforces
 * the rest: a draft never reaches `public_facts`, and a translation whose
 * source has changed is dropped rather than shown.
 */
export default async function TranslationsPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("translation_status_report")
    .select("locale, kind, fact_id, title, source_body, translation_id, translated_body, state")
    .order("locale");

  async function saveTranslation(formData: FormData) {
    "use server";

    const supabaseAction = await createClient();
    const {
      data: { user },
    } = await supabaseAction.auth.getUser();
    if (user === null) redirect("/login");

    const locale = String(formData.get("locale") ?? "");
    const kind = String(formData.get("kind") ?? "");
    const factId = String(formData.get("fact_id") ?? "");
    const sourceBody = String(formData.get("source_body") ?? "");
    const body = String(formData.get("body") ?? "").trim();
    const approve = formData.get("approve") !== null;

    if (body === "" || !isLocale(locale)) {
      revalidatePath("/cockpit/translations");
      return;
    }

    // The hash is computed by the database from the same source text, so the
    // drift check compares like with like rather than trusting the client.
    const { data: hash } = await supabaseAction.rpc("fact_source_hash", {
      source_text: sourceBody,
    });

    const subject =
      kind === "project" ? { project_id: factId } : { employment_highlight_id: factId };

    const { error } = await supabaseAction.from("fact_translations").upsert(
      {
        user_id: user.id,
        locale,
        ...subject,
        body,
        status: approve ? "approved" : "draft",
        generator: "manual",
        source_hash: hash ?? "",
      },
      {
        onConflict: kind === "project" ? "project_id,locale" : "employment_highlight_id,locale",
      },
    );

    if (error !== null) throw new Error(error.message);

    revalidatePath("/cockpit/translations");
  }

  const byLocale = new Map<string, NonNullable<typeof rows>>();
  for (const row of rows ?? []) {
    const existing = byLocale.get(row.locale ?? "");
    if (existing === undefined) byLocale.set(row.locale ?? "", [row]);
    else existing.push(row);
  }

  const pending = (rows ?? []).filter(
    (row) => row.state === "missing" || row.state === "stale" || row.state === "draft",
  ).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Translations</h1>
        <Link
          href="/cockpit"
          className="text-sm text-(--color-accent) underline underline-offset-4"
        >
          Dashboard
        </Link>
      </header>

      <p className="mt-2 text-sm text-(--color-ink-muted)">
        {pending === 0
          ? "Every published fact has a current translation."
          : `${pending} translation(s) need attention. Until approved, readers see the English source.`}
      </p>

      {[...byLocale.entries()].map(([locale, localeRows]) => (
        <section key={locale} className="mt-10">
          <h2 className="text-sm font-medium">
            {isLocale(locale) ? LOCALE_NAMES[locale as Locale] : locale}
          </h2>

          <ul className="mt-4 flex flex-col gap-6">
            {localeRows.map((row) => (
              <li
                key={`${locale}-${row.fact_id}`}
                className="rounded-lg border border-(--color-border-subtle) p-4"
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-sm font-medium">{row.title ?? row.kind}</span>
                  <StateBadge state={row.state ?? "missing"} />
                </div>

                <p className="mt-2 text-xs leading-relaxed text-(--color-ink-muted)">
                  {row.source_body}
                </p>

                <form action={saveTranslation} className="mt-3 flex flex-col gap-2">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="kind" value={row.kind ?? ""} />
                  <input type="hidden" name="fact_id" value={row.fact_id ?? ""} />
                  <input type="hidden" name="source_body" value={row.source_body ?? ""} />

                  <textarea
                    name="body"
                    rows={3}
                    defaultValue={row.translated_body ?? ""}
                    placeholder="Translation"
                    className="rounded-md border border-(--color-border-subtle) bg-(--color-surface) px-3 py-2 text-sm"
                  />

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-md border border-(--color-border-subtle) px-3 py-1.5 text-sm"
                    >
                      Save draft
                    </button>
                    <button
                      type="submit"
                      name="approve"
                      value="1"
                      className="rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white"
                    >
                      Approve and publish
                    </button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {(rows ?? []).length === 0 ? (
        <p className="mt-10 text-sm text-(--color-ink-muted)">
          Nothing is published yet, so there is nothing to translate.
        </p>
      ) : null}
    </main>
  );
}

function StateBadge({ state }: { state: string }) {
  const tone =
    state === "approved"
      ? "text-(--color-good)"
      : state === "stale"
        ? "text-(--color-danger)"
        : "text-(--color-ink-muted)";

  const label = state === "stale" ? "stale — the source changed since this was written" : state;

  return <span className={`text-xs ${tone}`}>{label}</span>;
}
