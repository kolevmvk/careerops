import type { DocumentKind, GeneratedSection, SourceFact } from "./types.ts";
import { eligibleFacts } from "./visibility.ts";

/**
 * SPECIFICATION §6.4: select verified facts meeting the kind's visibility
 * minimum, then assemble from templates. v0.1 is deliberately template-only —
 * AI-assisted wording is v0.2, and it runs through the same validator.
 *
 * The assembler never writes a claim of its own. Every sentence it emits comes
 * from a fact's own text, so the output passes the validator by construction
 * rather than by luck. That is the point: if assembly could invent a phrase,
 * the validator would be catching its own generator.
 */

export interface AssembleOptions {
  kind: DocumentKind;
  facts: SourceFact[];
  /** Ordered section names; facts are grouped into these by kind. */
  headline?: string;
}

const SECTION_FOR_FACT: Record<SourceFact["kind"], string> = {
  employment: "experience",
  employment_highlight: "experience",
  project: "projects",
};

export interface AssembledDocument {
  sections: GeneratedSection[];
  /** Facts that were excluded, with the reason, so the gap is visible. */
  excluded: { id: string; reason: "unverified" | "visibility" }[];
}

export function assemble({ kind, facts }: AssembleOptions): AssembledDocument {
  const usable = eligibleFacts(facts, kind);
  const usableIds = new Set(usable.map((fact) => fact.id));

  const excluded = facts
    .filter((fact) => !usableIds.has(fact.id))
    .map((fact) => ({
      id: fact.id,
      reason: fact.verified ? ("visibility" as const) : ("unverified" as const),
    }));

  const grouped = new Map<string, SourceFact[]>();

  for (const fact of usable) {
    const section = SECTION_FOR_FACT[fact.kind];
    const existing = grouped.get(section);
    if (existing === undefined) {
      grouped.set(section, [fact]);
    } else {
      existing.push(fact);
    }
  }

  const sections: GeneratedSection[] = [];

  for (const [section, sectionFacts] of grouped) {
    sections.push({
      section,
      // Each fact contributes its own sentence, verbatim. Joining is the only
      // transformation, so nothing enters the text that a source did not say.
      text: sectionFacts.map((fact) => fact.text.trim()).join("\n"),
      sourceIds: sectionFacts.map((fact) => fact.id),
    });
  }

  return { sections, excluded };
}

/** Renders assembled sections to Markdown for `document_versions.rendered_md`. */
export function renderMarkdown(document: AssembledDocument, title: string): string {
  const parts = [`# ${title}`];

  for (const section of document.sections) {
    parts.push(`## ${titleCase(section.section)}`);
    for (const line of section.text.split("\n")) {
      if (line.trim() !== "") parts.push(`- ${line.trim()}`);
    }
  }

  return `${parts.join("\n\n")}\n`;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
