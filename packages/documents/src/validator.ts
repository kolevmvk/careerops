import type { DocumentKind, GeneratedSection, SourceFact, Violation } from "./types.ts";
import { atLeast, documentKindVisibilityMinimum, effectiveVisibility } from "./visibility.ts";

/**
 * SPECIFICATION §8. Every generated sentence keeps source references, and a
 * validator rejects numbers, dates and proper names not present in the sources.
 *
 * The validator is deliberately biased toward rejection. A false rejection
 * costs a moment of review; a false acceptance puts a fabricated claim in
 * front of an employer. When a check is ambiguous, it fails.
 *
 * What it does not do: this is not a fact checker. It catches the fabrications
 * that carry the most risk and are mechanically detectable - invented metrics,
 * dates, employers, products and technologies. A sentence built entirely from
 * lowercase words can still assert something its sources never said, so a
 * human still reads the draft before it is frozen. `test/validator.test.ts`
 * pins that limit explicitly.
 */

const NUMBER_WORDS = new Map<string, string>([
  ["one", "1"],
  ["two", "2"],
  ["three", "3"],
  ["four", "4"],
  ["five", "5"],
  ["six", "6"],
  ["seven", "7"],
  ["eight", "8"],
  ["nine", "9"],
  ["ten", "10"],
  ["eleven", "11"],
  ["twelve", "12"],
  ["thirteen", "13"],
  ["fourteen", "14"],
  ["fifteen", "15"],
  ["sixteen", "16"],
  ["seventeen", "17"],
  ["eighteen", "18"],
  ["nineteen", "19"],
  ["twenty", "20"],
  ["thirty", "30"],
  ["forty", "40"],
  ["fifty", "50"],
  ["sixty", "60"],
  ["seventy", "70"],
  ["eighty", "80"],
  ["ninety", "90"],
  ["hundred", "100"],
  ["thousand", "1000"],
  ["million", "1000000"],
]);

const MONTHS = new Set([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]);

/**
 * Capitalized words that carry no claim. Kept short on purpose: every addition
 * is a hole in the check, so a word earns its place only when it is common and
 * could never be a company, product, technology or person.
 */
const HARMLESS_CAPITALS = new Set([
  "i",
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "then",
  "for",
  "with",
  "without",
  "from",
  "to",
  "in",
  "on",
  "at",
  "by",
  "of",
  "as",
  "this",
  "that",
  "these",
  "those",
  "it",
  "we",
  "they",
  "he",
  "she",
  "you",
]);

/** Lowercase, strip accents and punctuation, collapse whitespace. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Digits a source asserts, in every form the text might spell them. */
function numericForms(text: string): Set<string> {
  const forms = new Set<string>();
  const normalized = normalize(text);

  for (const match of normalized.matchAll(/\d[\d.,]*/g)) {
    forms.add(match[0].replace(/[.,]$/, "").replace(/,/g, ""));
  }

  for (const [word, digits] of NUMBER_WORDS) {
    if (new RegExp(`\\b${word}\\b`).test(normalized)) {
      forms.add(digits);
      forms.add(word);
    }
  }

  return forms;
}

interface Claims {
  numbers: string[];
  dates: string[];
  names: string[];
}

const SENTENCE_BREAK = /[.!?:;\n\r]|^\s*[-*•]\s+/;

/**
 * Tokens that open a sentence are capitalized by grammar, not by meaning, so
 * they are not treated as names. Everything else capitalized is a candidate.
 */
function extractClaims(text: string): Claims {
  const numbers = new Set<string>();
  const dates = new Set<string>();
  const names = new Set<string>();

  // ISO dates first, so their digits are not also read as bare numbers.
  const withoutIso = text.replace(/\b\d{4}-\d{2}-\d{2}\b/g, (iso) => {
    dates.add(iso);
    return " ";
  });

  const withoutYears = withoutIso.replace(/\b(19|20)\d{2}\b/g, (year) => {
    dates.add(year);
    return " ";
  });

  for (const match of withoutYears.matchAll(/\d[\d.,]*%?/g)) {
    const cleaned = match[0].replace(/[.,]$/, "").replace(/,/g, "").replace(/%$/, "");
    if (cleaned.length > 0) numbers.add(cleaned);
  }

  const segments = withoutYears.split(SENTENCE_BREAK);

  for (const segment of segments) {
    const words = segment.match(/[\p{L}][\p{L}'-]*/gu) ?? [];

    words.forEach((word, index) => {
      const lower = word.toLowerCase();

      if (MONTHS.has(lower)) {
        dates.add(lower);
        return;
      }

      if (NUMBER_WORDS.has(lower)) {
        numbers.add(lower);
        return;
      }

      const first = word[0];
      const startsSentence = index === 0;
      const capitalized =
        first !== undefined && first === first.toUpperCase() && /\p{L}/u.test(first);
      const isAllCaps = word.length > 1 && word === word.toUpperCase() && /\p{L}/u.test(word);
      // iOS, iPhone, eBay, jQuery, PostgreSQL: an uppercase letter after the
      // first position marks a product name regardless of where it sits, and
      // regardless of whether the first letter is capitalized at all.
      const hasInnerCapital = /\p{Lu}/u.test(word.slice(1));

      if (HARMLESS_CAPITALS.has(lower)) return;

      // An acronym or a mixed-case name carries its claim even sentence-initial,
      // because grammar is not what capitalized it.
      if (isAllCaps || hasInnerCapital) {
        names.add(lower);
        return;
      }

      if (startsSentence || !capitalized) return;

      names.add(lower);
    });
  }

  return {
    numbers: [...numbers],
    dates: [...dates],
    names: [...names],
  };
}

function supports(sourceText: string, sourceNumbers: Set<string>, claim: string): boolean {
  const normalizedClaim = normalize(claim);
  if (normalizedClaim.length === 0) return true;

  if (/^\d/.test(normalizedClaim)) {
    return sourceNumbers.has(normalizedClaim.replace(/,/g, ""));
  }

  if (NUMBER_WORDS.has(normalizedClaim)) {
    const digits = NUMBER_WORDS.get(normalizedClaim);
    return (
      sourceNumbers.has(normalizedClaim) || (digits !== undefined && sourceNumbers.has(digits))
    );
  }

  return new RegExp(`(^| )${escapeRegExp(normalizedClaim)}($| )`).test(sourceText);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface ValidateOptions {
  sections: GeneratedSection[];
  facts: SourceFact[];
  kind: DocumentKind;
}

export function validateSections({ sections, facts, kind }: ValidateOptions): Violation[] {
  const violations: Violation[] = [];
  const byId = new Map(facts.map((fact) => [fact.id, fact]));
  const minimum = documentKindVisibilityMinimum(kind);

  for (const section of sections) {
    if (section.sourceIds.length === 0) {
      violations.push({
        section: section.section,
        kind: "unsourced_section",
        token: section.section,
        message: `Section "${section.section}" cites no source (SPECIFICATION §8).`,
      });
      continue;
    }

    const usable: SourceFact[] = [];

    for (const id of section.sourceIds) {
      const fact = byId.get(id);

      if (fact === undefined) {
        violations.push({
          section: section.section,
          kind: "unknown_source",
          token: id,
          message: `Source ${id} does not exist.`,
        });
        continue;
      }

      if (!fact.verified) {
        violations.push({
          section: section.section,
          kind: "unverified_source",
          token: id,
          message: `Source ${id} is not verified and cannot back a claim (DOMAIN I5).`,
        });
        continue;
      }

      const effective = effectiveVisibility(fact);
      if (!atLeast(effective, minimum)) {
        violations.push({
          section: section.section,
          kind: "ineligible_source",
          token: id,
          message: `Source ${id} is ${effective} but a ${kind} needs ${minimum} (DOMAIN I4).`,
        });
        continue;
      }

      usable.push(fact);
    }

    if (usable.length === 0) continue;

    const sourceText = ` ${usable.map((fact) => normalize(fact.text)).join(" ")} `;
    const sourceNumbers = new Set<string>();
    for (const fact of usable) {
      for (const form of numericForms(fact.text)) sourceNumbers.add(form);
    }

    const claims = extractClaims(section.text);

    for (const number of claims.numbers) {
      if (!supports(sourceText, sourceNumbers, number)) {
        violations.push({
          section: section.section,
          kind: "unsupported_number",
          token: number,
          message: `The number "${number}" does not appear in the cited sources.`,
        });
      }
    }

    for (const date of claims.dates) {
      if (!supports(sourceText, sourceNumbers, date)) {
        violations.push({
          section: section.section,
          kind: "unsupported_date",
          token: date,
          message: `The date "${date}" does not appear in the cited sources.`,
        });
      }
    }

    for (const name of claims.names) {
      if (!supports(sourceText, sourceNumbers, name)) {
        violations.push({
          section: section.section,
          kind: "unsupported_name",
          token: name,
          message: `The name "${name}" does not appear in the cited sources.`,
        });
      }
    }
  }

  return violations;
}

/** True when every section is sourced and every claim is supported. */
export function isPublishable(options: ValidateOptions): boolean {
  return validateSections(options).length === 0;
}
