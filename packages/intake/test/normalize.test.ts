import { describe, expect, it } from "vitest";

import { contentHash, normalizeAdText, normalizeAdUrl, urlHash } from "../src/normalize.ts";

describe("the same ad on two lanes produces one row", () => {
  // The core promise of SPECIFICATION §7.1. An ad pulled from an ATS API and
  // the same ad arriving in a job-alert email must collide.
  it("collides across whitespace, case and line ending differences", () => {
    const fromApi = "Senior Flutter Engineer\n\nWe need offline-first delivery apps.";
    const fromEmail = "SENIOR FLUTTER ENGINEER\r\n   We need offline-first delivery apps.  ";

    expect(contentHash(fromApi)).toBe(contentHash(fromEmail));
  });

  it("ignores tracking links wrapped around the same text", () => {
    const plain = "Senior Flutter Engineer. Apply at https://example.test/jobs/1";
    const tracked =
      "Senior Flutter Engineer. Apply at https://example.test/jobs/1?utm_source=email";

    expect(contentHash(plain)).toBe(contentHash(tracked));
  });

  it("ignores non-breaking spaces and zero-width characters from HTML mail", () => {
    const clean = "Senior Flutter Engineer";
    const fromHtml = "Senior\u00a0Flutter\u200bEngineer";

    expect(contentHash(fromHtml)).toBe(contentHash(clean));
  });

  it("still separates ads that differ in substance", () => {
    expect(contentHash("Senior Flutter Engineer")).not.toBe(contentHash("Junior Flutter Engineer"));
  });

  it("is stable across calls", () => {
    const text = "Mobile Integration Engineer";
    expect(contentHash(text)).toBe(contentHash(text));
  });
});

describe("normalizeAdText", () => {
  it("collapses punctuation and whitespace into comparable words", () => {
    expect(normalizeAdText("  Flutter / Dart — engineer!  ")).toBe("flutter dart engineer");
  });

  it("returns an empty string for text with no words", () => {
    expect(normalizeAdText("--- *** ---")).toBe("");
  });
});

describe("normalizeAdUrl", () => {
  it("drops tracking parameters and sorts the rest", () => {
    expect(normalizeAdUrl("https://example.test/jobs/1?utm_source=x&b=2&a=1&gclid=z")).toBe(
      "https://example.test/jobs/1?a=1&b=2",
    );
  });

  it("normalizes scheme, host, trailing slash and fragment", () => {
    expect(normalizeAdUrl("http://WWW.Example.test/jobs/1/#apply")).toBe(
      "https://example.test/jobs/1",
    );
  });

  it("keeps a bare root path", () => {
    expect(normalizeAdUrl("https://example.test/")).toBe("https://example.test/");
  });

  it("rejects input that is not an absolute http url", () => {
    expect(normalizeAdUrl("not a url")).toBeNull();
    expect(normalizeAdUrl("mailto:someone@example.test")).toBeNull();
    expect(normalizeAdUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("urlHash", () => {
  it("collides for the same ad behind different tracking links", () => {
    expect(urlHash("https://example.test/jobs/1?utm_campaign=alerts")).toBe(
      urlHash("https://www.example.test/jobs/1"),
    );
  });

  it("is null when there is no usable url", () => {
    expect(urlHash(null)).toBeNull();
    expect(urlHash(undefined)).toBeNull();
    expect(urlHash("   ")).toBeNull();
    expect(urlHash("not a url")).toBeNull();
  });
});
