import { describe, expect, it } from "vitest";
import { normalizePhrase } from "../src/index.ts";

describe("normalizePhrase", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizePhrase("  Amazon   Web Services  ")).toBe("amazon web services");
  });

  it("strips punctuation that isn't load-bearing", () => {
    expect(normalizePhrase("Node.js, React & TypeScript!")).toBe("node.js react typescript");
  });

  it("keeps +, # and . so C++, C# and .NET stay distinct from their letters alone", () => {
    expect(normalizePhrase("C++")).toBe("c++");
    expect(normalizePhrase("C#")).toBe("c#");
    expect(normalizePhrase(".NET")).toBe(".net");
    expect(normalizePhrase("C++")).not.toBe(normalizePhrase("C"));
  });
});
