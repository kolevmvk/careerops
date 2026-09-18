import { describe, expect, it } from "vitest";
import { guessRequiredLevel } from "../src/index.ts";

describe("guessRequiredLevel", () => {
  it("reads seniority words", () => {
    expect(guessRequiredLevel("Junior Backend Engineer")).toBe(1);
    expect(guessRequiredLevel("Senior Backend Engineer")).toBe(3);
    expect(guessRequiredLevel("Staff Engineer")).toBe(4);
    expect(guessRequiredLevel("Docker expert")).toBe(5);
  });

  it("reads years of experience when no seniority word is present", () => {
    expect(guessRequiredLevel("5+ years of Docker experience")).toBe(3);
    expect(guessRequiredLevel("1 year of experience with SQL")).toBe(1);
    expect(guessRequiredLevel("10+ years in infrastructure")).toBe(5);
  });

  it("prefers a seniority word over a conflicting years figure", () => {
    expect(guessRequiredLevel("Senior role, 1+ years in this specific tool")).toBe(3);
  });

  it("is null with no hint at all", () => {
    expect(guessRequiredLevel("Experience with Docker")).toBeNull();
  });
});
