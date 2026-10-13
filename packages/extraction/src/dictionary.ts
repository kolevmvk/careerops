import { normalizePhrase } from "./normalize.ts";
import type { AliasDictionary, AliasEntry, SkillEntry } from "./types.ts";

/**
 * Builds the lookup index from `skill_aliases` rows (one per user).
 *
 * Aliases alone are not enough: they exist to cover wording the catalog does
 * *not* already use ("Amazon Web Services" -> AWS), so a catalog with no
 * aliases for a skill matches nothing at all for it, even where the ad names
 * it exactly. Prefer {@link buildSkillDictionary}, which indexes the catalog's
 * own names and slugs as well.
 */
export function buildAliasIndex(entries: AliasEntry[]): AliasDictionary {
  const index = new Map<string, string>();
  for (const entry of entries) {
    index.set(entry.normalized, entry.skillId);
  }
  return index;
}

/**
 * Builds the lookup index from both the alias table and the skill catalog
 * itself, so a skill is matchable by its own name and slug without anyone
 * having written an alias for it first.
 *
 * Precedence on a collision is aliases, then names, then slugs: an alias is a
 * deliberate human mapping and outranks a coincidence between two catalog
 * entries. Within one source the first entry wins, so the result does not
 * depend on row order beyond that.
 */
export function buildSkillDictionary(input: {
  aliases?: AliasEntry[];
  skills?: SkillEntry[];
}): AliasDictionary {
  const index = new Map<string, string>();

  const add = (phrase: string, skillId: string): void => {
    const normalized = normalizePhrase(phrase);
    if (normalized.length === 0 || index.has(normalized)) return;
    index.set(normalized, skillId);
  };

  // `skill_aliases.normalized` is already normalized by the writer, but
  // normalizing again is idempotent and keeps one convention in one place.
  for (const alias of input.aliases ?? []) add(alias.normalized, alias.skillId);
  for (const skill of input.skills ?? []) add(skill.name, skill.skillId);
  for (const skill of input.skills ?? []) add(skill.slug, skill.skillId);

  return index;
}

export interface SkillMention {
  skillId: string;
  /** The normalized phrase that matched (the longest one, at this position). */
  phrase: string;
}

/**
 * Finds every skill mentioned in a line, longest phrase first so "Amazon Web
 * Services" matches as one skill instead of also matching "web" or
 * "services" as unrelated ones. Matched tokens are not reused.
 *
 * One skill is reported once per line even when the line names it several
 * ways: "operating Kubernetes (k8s) clusters" matches both the catalog name
 * and the alias, and that is one requirement, not two. Longest-first order
 * means the retained phrase is the most specific one.
 */
export function findSkillMentions(
  line: string,
  dictionary: AliasDictionary,
  maxPhraseWords = 4,
): SkillMention[] {
  const tokens = normalizePhrase(line).split(" ").filter(Boolean);
  const matches: SkillMention[] = [];
  const consumed = new Set<number>();
  const seenSkills = new Set<string>();

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
      if (skillId !== undefined && !seenSkills.has(skillId)) {
        seenSkills.add(skillId);
        matches.push({ skillId, phrase });
        for (let offset = 0; offset < size; offset++) {
          consumed.add(start + offset);
        }
      }
    }
  }

  return matches;
}
