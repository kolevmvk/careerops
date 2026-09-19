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

/** `language` hard constraints (docs/SCORING.md §5.3): a language name near a CEFR/fluency word. */
export function extractLanguageConstraints(text: string): HardConstraintRequirement[] {
  const lower = text.toLowerCase();
  const results: HardConstraintRequirement[] = [];
  const seen = new Set<string>();

  for (const language of LANGUAGE_NAMES) {
    let searchFrom = 0;
    let languageIndex = lower.indexOf(language, searchFrom);
    while (languageIndex !== -1) {
      const windowStart = Math.max(0, languageIndex - LANGUAGE_WINDOW_CHARS);
      const windowEnd = Math.min(
        lower.length,
        languageIndex + language.length + LANGUAGE_WINDOW_CHARS,
      );
      const window = text.slice(windowStart, windowEnd);
      const levelMatch = CEFR_PATTERN.exec(window);
      if (levelMatch?.[1] !== undefined && !seen.has(language)) {
        seen.add(language);
        results.push({
          kind: "language",
          rawText: window.trim(),
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
const YEARS_PATTERN = /(\d{1,3})\+?\s?(?:years?|yrs?)\s+(?:of\s+)?experience\b/gi;

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
