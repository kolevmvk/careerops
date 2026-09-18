import { describe, expect, it } from "vitest";
import { contentHash } from "../src/index.ts";

describe("contentHash", () => {
  it("is deterministic for the same content", async () => {
    const text = "Senior Backend Engineer at Example Corp.";
    expect(await contentHash(text)).toBe(await contentHash(text));
  });

  it("ignores only leading/trailing whitespace, not internal differences", async () => {
    const a = await contentHash("Senior Backend Engineer");
    const b = await contentHash("  Senior Backend Engineer  \n");
    expect(a).toBe(b);
  });

  it("differs for different content", async () => {
    const a = await contentHash("Senior Backend Engineer");
    const b = await contentHash("Junior Backend Engineer");
    expect(a).not.toBe(b);
  });

  it("returns a 64-character hex SHA-256 digest", async () => {
    const hash = await contentHash("anything");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
