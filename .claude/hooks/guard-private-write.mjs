#!/usr/bin/env node
// PreToolUse guard for agents whose output is private working material
// (ADR-0017). Such an agent may write inside `private/` and nowhere else, so
// research notes about real organizations cannot land in a tracked file by
// mistake. `private/` is git-ignored (ADR-0012).

import { readFileSync } from "node:fs";
import { argv, env, exit, stdout } from "node:process";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export function evaluateWrite(filePath, projectDir) {
  if (typeof filePath !== "string" || filePath === "") {
    return { decision: "deny", reason: "A write without a file path cannot be checked." };
  }
  const target = resolve(projectDir, filePath);
  const inside = relative(resolve(projectDir, "private"), target);
  if (inside !== "" && !inside.startsWith("..") && !isAbsolute(inside)) return null;
  return {
    decision: "deny",
    reason: `This agent writes only inside private/ (got ${relative(projectDir, target).split(sep).join("/") || target}).`,
  };
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    // Unlike the shell guard this one fails closed: its only job is to refuse.
    input = {};
  }
  const projectDir = env.CLAUDE_PROJECT_DIR ?? input.cwd ?? ".";
  const result = evaluateWrite(input?.tool_input?.file_path, projectDir);
  if (!result) exit(0);

  stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: result.decision,
        permissionDecisionReason: result.reason,
      },
    }),
  );
}

if (argv[1] && import.meta.url === pathToFileURL(argv[1]).href) main();
