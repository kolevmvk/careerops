import { createHash } from "node:crypto";

/**
 * SPECIFICATION §7.1. Three lanes converge on one `jobs` table, so the same ad
 * arriving by ATS API and again by job-alert email must produce one row.
 *
 * Dedupe therefore cannot hash the raw text: the two lanes deliver different
 * whitespace, tracking parameters and boilerplate around identical content.
 * Normalization strips everything that differs by delivery and keeps only what
 * differs by ad.
 */

/** Query parameters every tracker adds and no ad depends on. */
const TRACKING_PARAMS = [
  /^utm_/i,
  /^gclid$/i,
  /^fbclid$/i,
  /^msclkid$/i,
  /^mc_(cid|eid)$/i,
  /^ref$/i,
  /^referer$/i,
  /^referrer$/i,
  /^source$/i,
  /^src$/i,
  /^trk$/i,
  /^trackingId$/i,
  /^originalSubdomain$/i,
  /^lipi$/i,
];

export function normalizeAdText(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u200b-\u200d\ufeff]/g, " ")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Canonical form of an ad URL: scheme and host lowercased, `www.` dropped,
 * tracking parameters removed, remaining parameters sorted, fragment dropped.
 * Returns null when the input is not a usable absolute URL.
 */
export function normalizeAdUrl(raw: string): string | null {
  let url: URL;

  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.hash = "";

  const kept = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAMS.some((pattern) => pattern.test(key)))
    .sort(([a], [b]) => a.localeCompare(b));

  url.search = "";
  for (const [key, value] of kept) url.searchParams.append(key, value);

  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Stable identity of an ad's content, independent of the lane that fetched it. */
export function contentHash(rawText: string): string {
  return sha256(normalizeAdText(rawText));
}

/** Stable identity of an ad's location, or null when there is no usable URL. */
export function urlHash(rawUrl: string | null | undefined): string | null {
  if (rawUrl === null || rawUrl === undefined || rawUrl.trim() === "") return null;

  const normalized = normalizeAdUrl(rawUrl);
  return normalized === null ? null : sha256(normalized);
}
