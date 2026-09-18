import { describe, expect, it } from "vitest";
import { classifyLines } from "../src/index.ts";

describe("classifyLines", () => {
  it("drops lines before the first recognized header", () => {
    const text = [
      "We are a fast-growing company building great things.",
      "Requirements",
      "- Docker",
    ].join("\n");
    expect(classifyLines(text)).toEqual([{ line: "Docker", importance: "required" }]);
  });

  it("tags lines under a preferred header as preferred", () => {
    const text = ["Requirements", "- Docker", "Nice to have", "- Kubernetes"].join("\n");
    expect(classifyLines(text)).toEqual([
      { line: "Docker", importance: "required" },
      { line: "Kubernetes", importance: "preferred" },
    ]);
  });

  it("drops lines under a benefits/company-description header", () => {
    const text = [
      "Requirements",
      "- Docker",
      "Beyond the paycheck",
      "- Private health insurance",
      "- Gym membership",
    ].join("\n");
    expect(classifyLines(text)).toEqual([{ line: "Docker", importance: "required" }]);
  });

  it("strips bullet markers", () => {
    const text = ["Requirements", "• Docker", "* Kubernetes", "- Terraform"].join("\n");
    expect(classifyLines(text).map((l) => l.line)).toEqual(["Docker", "Kubernetes", "Terraform"]);
  });

  it("does not mistake a long sentence mentioning 'requirements' for a header", () => {
    const text = [
      "Requirements",
      "This role has a lot of requirements around distributed systems and reliability that go beyond a single line.",
    ].join("\n");
    expect(classifyLines(text)).toHaveLength(1);
  });
});
