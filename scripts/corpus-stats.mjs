#!/usr/bin/env node
// Reports on the local job-ad corpus so the phase 0 exit criterion is checkable.
// Reads only front matter; ad bodies are never printed. The corpus itself is
// git-ignored private data (ADR-0012), so this script ships without it.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { argv, exit, stdout } from "node:process";

const DIR = argv[2] ?? "private/job-corpus";
const TARGET = Number(argv[3] ?? 20);
const SKIP = new Set(["README.md", "TEMPLATE.md"]);

const FIELDS = ["company", "title", "remote_policy", "target_role", "relevance", "lane"];
const REQUIRED = ["company", "title", "relevance"];

function parseFrontMatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) return null;
  const out = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (field && FIELDS.includes(field[1])) out[field[1]] = field[2].trim();
  }
  return out;
}

function tally(rows, key, fallback = "unspecified") {
  const counts = new Map();
  for (const row of rows) {
    const value = row[key] || fallback;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]);
}

function bar(label, count, total, width = 24) {
  const filled = total ? Math.round((count / total) * width) : 0;
  const name = label.length > 30 ? `${label.slice(0, 29)}…` : label;
  return `  ${name.padEnd(30)} ${String(count).padStart(3)}  ${"█".repeat(filled)}`;
}

let names;
try {
  names = (await readdir(DIR)).filter((n) => n.endsWith(".md") && !SKIP.has(n));
} catch {
  stdout.write(`No corpus directory at ${DIR}\n`);
  exit(1);
}

const rows = [];
const malformed = [];

for (const name of names) {
  const front = parseFrontMatter(await readFile(join(DIR, name), "utf8"));
  if (!front) {
    malformed.push(`${name}: no front matter`);
    continue;
  }
  const missing = REQUIRED.filter((f) => !front[f]);
  if (missing.length) malformed.push(`${name}: missing ${missing.join(", ")}`);
  rows.push(front);
}

const total = rows.length;
const applyNow = rows.filter((r) => r.relevance === "2").length;

stdout.write(`\nJob corpus — ${DIR}\n\n`);
stdout.write(`  ads collected      ${total} / ${TARGET}\n`);
stdout.write(`  would apply now    ${applyNow}\n`);

for (const [key, heading] of [
  ["lane", "By intake lane"],
  ["target_role", "By target role"],
  ["remote_policy", "By remote policy"],
]) {
  const counts = tally(rows, key);
  if (!counts.length) continue;
  stdout.write(`\n${heading}\n`);
  for (const [label, count] of counts) stdout.write(`${bar(label, count, total)}\n`);
}

if (malformed.length) {
  stdout.write(`\nNeeds fixing (${malformed.length})\n`);
  for (const problem of malformed) stdout.write(`  ${problem}\n`);
}

const met = total >= TARGET && malformed.length === 0;
stdout.write(`\nPhase 0 exit criterion: ${met ? "MET" : "NOT MET"}\n\n`);
exit(met ? 0 : 1);
