import { SOURCE_LOCALE } from "@/lib/i18n.ts";
import { readPublic } from "@/lib/supabase/public.ts";

export const revalidate = 3600;

/**
 * SPECIFICATION §13.2. The same published facts as the portfolio page, in the
 * form a crawler or agent reads rather than renders. It is generated from
 * `public_facts`, so it can never contain a claim the portfolio would not show.
 */
export async function GET(): Promise<Response> {
  const { profile, facts } = await readPublic(
    "llms.txt",
    async (supabase) => {
      const [{ data: profileRow }, { data: factRows }] = await Promise.all([
        supabase
          .from("public_profiles")
          .select("full_name, headline, summary, location")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("public_facts")
          .select("kind, title, slug, body, repo_url, live_url")
          .eq("locale", SOURCE_LOCALE)
          .order("happened_at", { ascending: false }),
      ]);

      return { profile: profileRow, facts: factRows };
    },
    { profile: null, facts: [] as never[] },
  );

  if (profile === null) {
    return new Response("# Nothing published\n", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const lines = [`# ${profile.full_name ?? "Portfolio"}`, ""];

  if (profile.headline !== null) lines.push(`> ${profile.headline}`, "");
  if (profile.summary !== null) lines.push(profile.summary, "");
  if (profile.location !== null) lines.push(`Location: ${profile.location}`, "");

  const projects = (facts ?? []).filter((fact) => fact.kind === "project");
  const highlights = (facts ?? []).filter((fact) => fact.kind === "highlight");

  if (projects.length > 0) {
    lines.push("## Work", "");
    for (const project of projects) {
      const links = [project.live_url, project.repo_url].filter(
        (url): url is string => url !== null,
      );
      lines.push(`- **${project.title}**: ${project.body ?? ""}`);
      if (links.length > 0) lines.push(`  ${links.join(" · ")}`);
    }
    lines.push("");
  }

  if (highlights.length > 0) {
    lines.push("## Selected work", "");
    for (const highlight of highlights) lines.push(`- ${highlight.body ?? ""}`);
    lines.push("");
  }

  lines.push(
    "---",
    "",
    "Every statement above is generated from a verified record and carries a source.",
    "Nothing here is written by hand.",
    "",
  );

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
