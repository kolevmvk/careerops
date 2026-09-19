const SENIORITY_LEVEL: Array<{ pattern: RegExp; level: number }> = [
  { pattern: /\b(intern|entry[- ]level|junior)\b/i, level: 1 },
  { pattern: /\bmid(?:[- ]level)?\b/i, level: 2 },
  { pattern: /\bsenior\b/i, level: 3 },
  { pattern: /\b(lead|staff|principal)\b/i, level: 4 },
  { pattern: /\b(expert|architect)\b/i, level: 5 },
];

// Digits bounded to 3 (nobody requires 1000+ years): an unbounded `\d+`
// ahead of the optional `+`/whitespace groups is a polynomial-ReDoS shape
// on attacker-controlled ad text (CodeQL js/polynomial-redos).
const YEARS_PATTERN = /(\d{1,3})\+?\s?(?:years?|yrs?)\b/i;

/** Years of experience → a 0–5 level, roughly doubling every level. */
function levelFromYears(years: number): number {
  if (years < 2) return 1;
  if (years < 4) return 2;
  if (years < 6) return 3;
  if (years < 8) return 4;
  return 5;
}

/**
 * Best-effort `required_level` guess from seniority words or a years-of-
 * experience mention in a requirement line. `null` when neither is present
 * — the caller (docs/SCORING.md §5.1) falls back to `default_required_level`.
 * Seniority words are checked first: "senior (5+ years)" should read as
 * senior-level even if the years figure alone would suggest otherwise.
 */
export function guessRequiredLevel(line: string): number | null {
  for (const { pattern, level } of SENIORITY_LEVEL) {
    if (pattern.test(line)) return level;
  }
  const yearsMatch = YEARS_PATTERN.exec(line);
  if (yearsMatch?.[1] !== undefined) {
    return levelFromYears(Number(yearsMatch[1]));
  }
  return null;
}
