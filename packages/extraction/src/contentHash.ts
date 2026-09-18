/**
 * `jobs.content_hash` (exact-content dedupe, not fuzzy matching — two ads
 * differing only by re-formatting will not collide, by design). Uses the
 * Web Crypto API (`crypto.subtle`), available in both Node 22+ and Deno, so
 * this runs unmodified in a Supabase Edge Function (ADR-0016).
 */
export async function contentHash(rawText: string): Promise<string> {
  const bytes = new TextEncoder().encode(rawText.trim());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
