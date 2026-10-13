import { stripBulletPrefix } from "./sections.ts";
import type { HardConstraintRequirement, LanguageProficiency } from "./types.ts";

const LANGUAGE_NAMES = [
  "english",
  "german",
  "french",
  "spanish",
  "italian",
  "serbian",
  "russian",
  "dutch",
  "portuguese",
];

const CEFR_PATTERN = /\b(c2|c1|b2|b1|a2|a1|native|fluent)\b/i;
const LANGUAGE_WINDOW_CHARS = 40;

function normalizeLanguageLevel(raw: string): LanguageProficiency {
  const lower = raw.toLowerCase();
  if (lower === "fluent") return "c1"; // conservative floor: "fluent" claims vary, treat as C1
  if (lower === "native") return "native";
  return lower as LanguageProficiency;
}

/**
 * The text around a match, as a human would quote it: the enclosing line, or
 * a word-aligned window inside it when that line is a long paragraph.
 *
 * Slicing a fixed character count around the match instead produces stored
 * `raw_text` that starts and ends mid-word and runs across unrelated bullets
 * — "ng\n- Scripting in Python or Go\n- Fluent English..." for a match on the
 * third line. Review-queue rows are read by a human, so the quote has to be
 * readable on its own.
 */
function matchContext(text: string, matchIndex: number, matchLength: number): string {
  const lineStart = text.lastIndexOf("\n", matchIndex) + 1;
  const newlineAfter = text.indexOf("\n", matchIndex + matchLength);
  const lineEnd = newlineAfter === -1 ? text.length : newlineAfter;

  let start = Math.max(lineStart, matchIndex - LANGUAGE_WINDOW_CHARS);
  let end = Math.min(lineEnd, matchIndex + matchLength + LANGUAGE_WINDOW_CHARS);

  // Snap inwards off any partial word the window cut through. Both edges can
  // only move towards the match, so the match itself always survives.
  if (start > lineStart && !/\s/.test(text[start - 1] ?? " ")) {
    const nextBoundary = text.slice(start, matchIndex).search(/\s/);
    if (nextBoundary !== -1) start += nextBoundary + 1;
  }
  if (end < lineEnd && !/\s/.test(text[end] ?? " ")) {
    const lastBoundary = text.slice(matchIndex + matchLength, end).search(/\s\S*$/);
    if (lastBoundary !== -1) end = matchIndex + matchLength + lastBoundary;
  }

  return stripBulletPrefix(text.slice(start, end).trim());
}

/** `language` hard constraints (docs/SCORING.md §5.3): a language name near a CEFR/fluency word. */
export function extractLanguageConstraints(text: string): HardConstraintRequirement[] {
  const lower = text.toLowerCase();
  const results: HardConstraintRequirement[] = [];
  const seen = new Set<string>();

  for (const language of LANGUAGE_NAMES) {
    let searchFrom = 0;
    let languageIndex = lower.indexOf(language, searchFrom);
    while (languageIndex !== -1) {
      const context = matchContext(text, languageIndex, language.length);
      const levelMatch = CEFR_PATTERN.exec(context);
      if (levelMatch?.[1] !== undefined && !seen.has(language)) {
        seen.add(language);
        results.push({
          kind: "language",
          rawText: context,
          isHardConstraint: true,
          mappingStatus: "auto",
          requiredLanguageLevel: normalizeLanguageLevel(levelMatch[1]),
        });
      }
      searchFrom = languageIndex + language.length;
      languageIndex = lower.indexOf(language, searchFrom);
    }
  }

  return results;
}

// Digits bounded to 3, same reasoning as packages/extraction/src/levelHints.ts:
// unbounded `\d+` here is a polynomial-ReDoS shape on attacker-controlled ad
// text (CodeQL js/polynomial-redos).
//
// Up to two words may sit between the unit and "experience": ads write
// "5+ years of professional experience" and "3 years of hands-on production
// experience" at least as often as the bare form, and requiring adjacency
// dropped those silently. The bound is deliberate on both counts — it keeps
// the repetition finite for the same ReDoS reason, and it stops the pattern
// drifting across a sentence into an unrelated "experience" ("5 years ago we
// gained experience"). A possessive is allowed for "5 years' experience".
const YEARS_PATTERN =
  /(\d{1,3})\+?\s*(?:years?|yrs?)['’]?\s+(?:of\s+)?(?:[\p{L}][\p{L}-]*\s+){0,2}experience\b/giu;

/** `experience_years` hard constraints (docs/SCORING.md §5.3). Numeric, so no manual mapping is needed. */
export function extractExperienceYearsConstraints(text: string): HardConstraintRequirement[] {
  const results: HardConstraintRequirement[] = [];
  for (const match of text.matchAll(YEARS_PATTERN)) {
    const years = match[1];
    if (years === undefined) continue;
    results.push({
      kind: "experience_years",
      rawText: match[0],
      isHardConstraint: true,
      mappingStatus: "auto",
      years: Number(years),
    });
  }
  return results;
}

const KEYWORD_CONSTRAINTS: Array<{
  kind: "work_authorization" | "clearance" | "education";
  pattern: RegExp;
}> = [
  {
    kind: "work_authorization",
    pattern: /\b(work permit|work authorization|authorized to work|eligible to work)\b/i,
  },
  { kind: "clearance", pattern: /\b(security clearance|background check clearance)\b/i },
  { kind: "education", pattern: /\b(bachelor'?s? degree|master'?s? degree|university degree)\b/i },
];

/**
 * `work_authorization` / `clearance` / `education` (docs/SCORING.md §5.3):
 * flagged as present, but "manual confirmation in v0.1" — `mappingStatus`
 * stays `unmapped` until a human confirms against the profile.
 */
export function extractKeywordConstraints(text: string): HardConstraintRequirement[] {
  const results: HardConstraintRequirement[] = [];
  for (const { kind, pattern } of KEYWORD_CONSTRAINTS) {
    const match = pattern.exec(text);
    if (match) {
      results.push({ kind, rawText: match[0], isHardConstraint: true, mappingStatus: "unmapped" });
    }
  }
  return results;
}

export function extractHardConstraints(text: string): HardConstraintRequirement[] {
  return [
    ...extractLanguageConstraints(text),
    ...extractExperienceYearsConstraints(text),
    ...extractKeywordConstraints(text),
  ];
}
