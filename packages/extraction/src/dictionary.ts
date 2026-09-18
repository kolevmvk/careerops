import { normalizePhrase } from "./normalize.ts";
import type { AliasDictionary, AliasEntry } from "./types.ts";

/** Builds the lookup index from `skill_aliases` rows (one per user). */
export function buildAliasIndex(entries: AliasEntry[]): AliasDictionary {
  const index = new Map<string, string>();
  for (const entry of entries) {
    index.set(entry.normalized, entry.skillId);
  }
  return index;
}

export interface SkillMention {
  skillId: string;
  /** The normalized phrase that matched (the longest one, at this position). */
  phrase: string;
}

/**
 * Finds every alias match in a line, longest phrase first so "Amazon Web
 * Services" matches as one skill instead of also matching "web" or
 * "services" as unrelated ones. Matched tokens are not reused.
 */
export function findSkillMentions(
  line: string,
  dictionary: AliasDictionary,
  maxPhraseWords = 4,
): SkillMention[] {
  const tokens = normalizePhrase(line).split(" ").filter(Boolean);
  const matches: SkillMention[] = [];
  const consumed = new Set<number>();

  for (let size = Math.min(maxPhraseWords, tokens.length); size >= 1; size--) {
    for (let start = 0; start + size <= tokens.length; start++) {
      let overlaps = false;
      for (let offset = 0; offset < size; offset++) {
        if (consumed.has(start + offset)) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;

      const phrase = tokens.slice(start, start + size).join(" ");
      const skillId = dictionary.get(phrase);
      if (skillId !== undefined) {
        matches.push({ skillId, phrase });
        for (let offset = 0; offset < size; offset++) {
          consumed.add(start + offset);
        }
      }
    }
  }

  return matches;
}
