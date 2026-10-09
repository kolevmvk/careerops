import { describe, expect, it } from "vitest";
import { extractReadableText } from "../src/index.ts";

const NAV = `
<nav><a href="/">Home</a><a href="/jobs">Jobs</a></nav>
<header><div class="logo">Acme Corp</div></header>
<footer><p>&copy; 2026 Acme Corp. All rights reserved.</p></footer>
`;

const REAL_JOB_AD = Array.from(
  { length: 60 },
  (_, i) => `Requirement number ${i}: work with distributed systems and reliability engineering.`,
).join(" ");

describe("extractReadableText", () => {
  it("prefers <article> over surrounding chrome", () => {
    const html = `<html><body>${NAV}<article><h1>Senior Engineer</h1><p>${REAL_JOB_AD}</p></article></body></html>`;
    const result = extractReadableText(html);
    expect(result).not.toBeNull();
    expect(result?.text).toContain("Senior Engineer");
    expect(result?.text).not.toContain("Home");
    expect(result?.text).not.toContain("All rights reserved");
  });

  it("falls back to <main> when there is no <article>", () => {
    const html = `<html><body>${NAV}<main><h1>Backend Developer</h1><p>${REAL_JOB_AD}</p></main></body></html>`;
    const result = extractReadableText(html);
    expect(result?.text).toContain("Backend Developer");
  });

  it("falls back to [role=main] when neither <article> nor <main> exist", () => {
    const html = `<html><body>${NAV}<div role="main"><p>${REAL_JOB_AD}</p></div></body></html>`;
    const result = extractReadableText(html);
    expect(result).not.toBeNull();
  });

  it("falls back to <body> as a last resort", () => {
    const html = `<html><body><div class="content"><p>${REAL_JOB_AD}</p></div></body></html>`;
    const result = extractReadableText(html);
    expect(result).not.toBeNull();
    expect(result?.wordCount).toBeGreaterThan(50);
  });

  it("returns null for a near-empty page (JS shell, cookie wall, login gate)", () => {
    const html = `<html><body><div id="root"></div><script>/* app mounts here */</script></body></html>`;
    expect(extractReadableText(html)).toBeNull();
  });

  it("returns null when only chrome/boilerplate is present", () => {
    const html = `<html><body>${NAV}</body></html>`;
    expect(extractReadableText(html)).toBeNull();
  });

  it("strips script and style content out of the extracted text", () => {
    const html = `<html><body><article><style>.x{color:red}</style><script>alert(1)</script><p>${REAL_JOB_AD}</p></article></body></html>`;
    const result = extractReadableText(html);
    expect(result?.text).not.toContain("alert(1)");
    expect(result?.text).not.toContain("color:red");
  });
});
