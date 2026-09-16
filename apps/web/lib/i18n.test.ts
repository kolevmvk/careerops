import { describe, expect, it } from "vitest";

import { localePath, negotiateLocale } from "./i18n.ts";

describe("negotiateLocale", () => {
  it("picks the highest quality supported language", () => {
    expect(negotiateLocale("de-DE,de;q=0.9,en;q=0.8")).toBe("de");
    expect(negotiateLocale("en-GB,en;q=0.9")).toBe("en");
  });

  it("matches a region tag to its base language", () => {
    expect(negotiateLocale("de-AT")).toBe("de");
    expect(negotiateLocale("sr-Latn-RS")).toBe("sr");
  });

  it("skips unsupported languages instead of failing the header", () => {
    expect(negotiateLocale("fr-FR,fr;q=0.9,de;q=0.5")).toBe("de");
  });

  it("respects quality ordering over header order", () => {
    expect(negotiateLocale("en;q=0.2,de;q=0.9")).toBe("de");
  });

  it("ignores a language the visitor explicitly refused", () => {
    expect(negotiateLocale("de;q=0,en;q=0.9")).toBe("en");
  });

  it("returns null when nothing matches, so the caller falls back", () => {
    expect(negotiateLocale("fr,es,it")).toBeNull();
    expect(negotiateLocale("*")).toBeNull();
    expect(negotiateLocale("")).toBeNull();
    expect(negotiateLocale(null)).toBeNull();
  });
});

describe("localePath", () => {
  it("leaves the source locale unprefixed", () => {
    expect(localePath("en")).toBe("/");
    expect(localePath("en", "/projects/sync")).toBe("/projects/sync");
  });

  it("prefixes every other locale", () => {
    expect(localePath("de")).toBe("/de");
    expect(localePath("sr", "/projects/sync")).toBe("/sr/projects/sync");
  });

  it("accepts a path with or without a leading slash", () => {
    expect(localePath("de", "projects")).toBe("/de/projects");
    expect(localePath("de", "/projects")).toBe("/de/projects");
  });
});
