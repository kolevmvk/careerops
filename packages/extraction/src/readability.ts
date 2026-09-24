import { load } from "cheerio";

// Boilerplate/chrome that never carries the job ad itself.
const NOISE_SELECTORS =
  "script, style, noscript, nav, header, footer, svg, iframe, form, button, aside, [aria-hidden='true']";

// Prefer the most specific semantic container that actually has content;
// fall back to progressively less specific ones. `body` is last resort —
// it's the noisiest (still carries every remaining boilerplate block), but
// better than nothing for pages with no semantic markup at all.
const CANDIDATE_SELECTORS = ["article", "main", "[role='main']", "body"];

// Below this, the "extraction" is more likely a JS-shell placeholder
// ("Loading...", a cookie banner, a login wall) than a real job ad. docs/
// SPECIFICATION.md §7: on failure, ask for a paste — don't guess with a
// near-empty result.
const MIN_WORD_COUNT = 50;

export interface ReadabilityResult {
  text: string;
  wordCount: number;
}

function normalizeWhitespace(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Best-effort main-content extraction from a raw HTML page (docs/
 * SPECIFICATION.md §7's "server-side fetch with readability extraction").
 * Deliberately simple, not a full Mozilla-Readability port — job ad pages
 * are semi-structured enough that picking the right semantic container
 * beats a scoring algorithm. Returns `null` when nothing candidate has
 * enough text to plausibly be a job ad; the caller should ask for a paste
 * instead of silently importing whatever scraps it found.
 */
export function extractReadableText(html: string): ReadabilityResult | null {
  const $ = load(html);
  $(NOISE_SELECTORS).remove();

  for (const selector of CANDIDATE_SELECTORS) {
    const text = normalizeWhitespace($(selector).first().text());
    const wordCount = countWords(text);
    if (wordCount >= MIN_WORD_COUNT) {
      return { text, wordCount };
    }
  }
  return null;
}
