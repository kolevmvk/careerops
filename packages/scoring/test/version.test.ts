import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCORING_VERSION } from "../src/index.ts";

describe("SCORING_VERSION", () => {
  it("matches the version declared in docs/SCORING.md", () => {
    const doc = readFileSync(new URL("../../../docs/SCORING.md", import.meta.url), "utf8");
    const declared = /Scoring version `([^`]+)`/.exec(doc)?.[1];

    expect(declared).toBe(SCORING_VERSION);
  });
});
