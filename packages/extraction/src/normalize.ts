/**
 * Matches `skill_aliases.normalized`'s convention (see the column comment in
 * `supabase/migrations/20260918054740_skill_catalog.sql`): lowercase,
 * punctuation stripped, whitespace collapsed. `+`, `#` and `.` are kept
 * because they're load-bearing in skill names (`C++`, `C#`, `.NET`) —
 * stripping them would collide `C++` with `C`.
 */
export function normalizePhrase(text: string): string {
  const collapsed = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+#.]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  // A "." is kept above so ".NET" and "Node.js" survive intact, but that
  // also keeps a sentence-ending period stuck to the last word ("services.").
  // Stripping one *trailing* dot per token removes that without touching a
  // dot that isn't at the very end (".net" doesn't end in ".", so it's untouched).
  return collapsed
    .split(" ")
    .map((token) => (token.length > 1 && token.endsWith(".") ? token.slice(0, -1) : token))
    .join(" ");
}
