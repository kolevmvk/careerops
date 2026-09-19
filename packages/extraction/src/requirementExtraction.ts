import { findSkillMentions } from "./dictionary.ts";
import { extractHardConstraints } from "./hardConstraints.ts";
import { guessRequiredLevel } from "./levelHints.ts";
import { normalizePhrase } from "./normalize.ts";
import { classifyLines } from "./sections.ts";
import type {
  AliasDictionary,
  RequirementExtractionResult,
  UnmappedRequirementCandidate,
} from "./types.ts";

// A leftover phrase longer than this reads as a sentence fragment, not a
// discrete requirement — queuing it would make the review queue a chore
// instead of a handful of real gaps to name.
const MAX_UNMAPPED_PHRASE_WORDS = 6;

const PHRASE_DELIMITERS = /,|;|\/|\(|\)| and | or | with | using /i;

function splitCandidatePhrases(line: string): string[] {
  return line
    .split(PHRASE_DELIMITERS)
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length > 0);
}

/**
 * Deterministic requirement extraction (docs/SPECIFICATION.md §4.1, §7;
 * docs/DOMAIN.md D6). Matches alias-dictionary phrases per requirement line,
 * classifies leftover short phrases as review-queue candidates, and scans
 * the whole ad separately for hard constraints.
 */
export function extractRequirements(
  rawText: string,
  dictionary: AliasDictionary,
): RequirementExtractionResult {
  const result: RequirementExtractionResult = {
    skillRequirements: [],
    unmappedCandidates: [],
    hardConstraints: extractHardConstraints(rawText),
  };
  const seenUnmapped = new Set<string>();

  for (const { line, importance } of classifyLines(rawText)) {
    const mentions = findSkillMentions(line, dictionary);
    if (mentions.length > 0) {
      const requiredLevel = guessRequiredLevel(line);
      for (const mention of mentions) {
        result.skillRequirements.push({
          rawText: line,
          importance,
          skillId: mention.skillId,
          requiredLevel,
          mappingStatus: "auto",
        });
      }
      continue;
    }

    for (const phrase of splitCandidatePhrases(line)) {
      const wordCount = phrase.split(/\s+/).filter(Boolean).length;
      if (wordCount === 0 || wordCount > MAX_UNMAPPED_PHRASE_WORDS) continue;
      if (!/[a-zA-Z]/.test(phrase)) continue;

      const key = normalizePhrase(phrase);
      if (key.length === 0 || seenUnmapped.has(key)) continue;
      seenUnmapped.add(key);

      const candidate: UnmappedRequirementCandidate = { rawText: phrase, importance };
      result.unmappedCandidates.push(candidate);
    }
  }

  return result;
}
