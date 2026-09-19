import type { RequirementImportance } from "./types.ts";

// Headers are short lines, so a length guard keeps a paragraph that happens
// to mention "requirements" mid-sentence from being mistaken for one.
const MAX_HEADER_LENGTH = 60;

const REQUIRED_HEADERS =
  /\b(requirements?|responsibilit(?:y|ies)|must[- ]haves?|about you|what you.?ll (?:need|bring|do)|qualifications|required skills?|core responsibilities)\b/i;
const PREFERRED_HEADERS =
  /\b(nice[- ]to[- ]have|preferred|bonus(?:es)?|good to have|pluses?|would be a plus)\b/i;
const IGNORED_HEADERS =
  /\b(benefits?|beyond the paycheck|about (?:us|the company)|perks|why (?:join|work with) us|what we offer|company overview|career opportunit(?:y|ies))\b/i;

const BULLET_PREFIX = /^[-*•▪‣◦]\s*/;

export interface ClassifiedLine {
  line: string;
  importance: RequirementImportance;
}

/**
 * Splits raw ad text into candidate requirement lines, tagged `required` or
 * `preferred` by the nearest preceding section header. Lines before the
 * first recognized header, and lines under a benefits/company-description
 * header, are dropped — they're prose, not requirements, and including them
 * would flood the review queue with noise instead of real gaps.
 */
export function classifyLines(rawText: string): ClassifiedLine[] {
  let current: RequirementImportance | "ignored" = "ignored";
  const result: ClassifiedLine[] = [];

  for (const rawLine of rawText.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (trimmed.length === 0) continue;

    if (trimmed.length <= MAX_HEADER_LENGTH) {
      if (PREFERRED_HEADERS.test(trimmed)) {
        current = "preferred";
        continue;
      }
      if (REQUIRED_HEADERS.test(trimmed)) {
        current = "required";
        continue;
      }
      if (IGNORED_HEADERS.test(trimmed)) {
        current = "ignored";
        continue;
      }
    }

    if (current === "ignored") continue;
    result.push({ line: trimmed.replace(BULLET_PREFIX, ""), importance: current });
  }

  return result;
}
