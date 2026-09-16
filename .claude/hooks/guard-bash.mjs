#!/usr/bin/env node
// PreToolUse guard for shell commands run by the coding agent (ADR-0017).
//
// Branch protection already stops a bad push on the server. Nothing stops a
// destructive command against the shared database, so that is what this guard
// exists for; the git rules are a second layer that fails earlier and explains
// why. It is deliberately small: every rule maps to a real way this repository
// can be damaged, and anything it cannot decide is left to the normal
// permission prompt.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { argv, exit, stdout } from "node:process";
import { pathToFileURL } from "node:url";

const PROTECTED = new Set(["main", "develop"]);

const SQL_RULES = [
  {
    pattern: /\bdrop\s+schema\s+(?:if\s+exists\s+)?"?public"?(?![\w.])/i,
    reason: "Dropping the public schema destroys the other application in the shared database.",
  },
  {
    pattern:
      /\b(?:truncate(?:\s+table)?|delete\s+from|drop\s+table(?:\s+if\s+exists)?)\s+"?auth"?\."?users\b/i,
    reason: "auth.users holds another application's customers and is not CareerOps data.",
  },
];

// Heredoc bodies and quoted strings are text, not commands. Without removing
// them, a commit message that mentions `git push origin main` would be refused.
function stripText(command) {
  return command
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\s|$)/g, "<<HEREDOC")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'[^']*'/g, "''");
}

function segments(command) {
  return stripText(command)
    .split(/&&|\|\||[;|\n]/)
    .map((segment) => segment.trim().split(/\s+/).filter(Boolean))
    .filter((tokens) => tokens.length > 0);
}

function gitInvocation(tokens) {
  const start = tokens.findIndex((token) => token === "git" || token.endsWith("/git"));
  if (start === -1) return null;
  let index = start + 1;
  while (index < tokens.length && tokens[index].startsWith("-")) {
    // -C <path> and -c <key=value> take a value; other global flags do not.
    index += tokens[index] === "-C" || tokens[index] === "-c" ? 2 : 1;
  }
  return { subcommand: tokens[index], args: tokens.slice(index + 1) };
}

function checkGit(tokens, currentBranch) {
  const git = gitInvocation(tokens);
  if (!git) return null;
  const { subcommand, args } = git;

  if ((subcommand === "commit" || subcommand === "push") && args.includes("--no-verify")) {
    return deny("--no-verify skips the lefthook checks; fix the failure instead.");
  }

  if (subcommand === "add" && args.some((arg) => arg === "-f" || arg === "--force")) {
    return deny(
      "Force-adding bypasses .gitignore, which is what keeps private career data out of a public repository.",
    );
  }

  if (subcommand !== "push") return null;

  if (
    args.some((arg) => arg === "--force" || arg === "-f" || arg === "--mirror" || arg === "--all")
  ) {
    return deny(
      "Use --force-with-lease on your own branch; plain force, --all and --mirror can overwrite protected history.",
    );
  }

  const refspecs = args.filter((arg) => !arg.startsWith("-")).slice(1);
  const target = refspecs.find((ref) =>
    PROTECTED.has(
      ref
        .replace(/^\+/, "")
        .split(":")
        .pop()
        .replace(/^refs\/heads\//, ""),
    ),
  );
  if (target) {
    return deny(
      `${target} only changes through a pull request (CONTRIBUTING.md, branching model).`,
    );
  }
  if (refspecs.length === 0 && PROTECTED.has(currentBranch)) {
    return deny(
      `The current branch is ${currentBranch}, which only changes through a pull request.`,
    );
  }
  return null;
}

function checkSupabase(tokens) {
  const start = tokens.findIndex((token) => token === "supabase" || token.endsWith("/supabase"));
  if (start === -1) return null;
  const [group, action] = tokens.slice(start + 1).filter((token) => !token.startsWith("-"));
  const flags = tokens.slice(start + 1);

  if (group === "db" && action === "reset") {
    const remote = flags.some(
      (flag) => flag === "--linked" || flag === "--db-url" || flag.startsWith("--db-url="),
    );
    return remote
      ? deny(
          "db reset against a remote drops the shared database, including an unrelated live application. It is a local and CI-only command (ADR-0016).",
        )
      : null;
  }
  if (group === "db" && action === "push") {
    return ask(
      "db push changes the hosted database that CareerOps shares with another application; the owner confirms each one.",
    );
  }
  return null;
}

function checkGh(tokens) {
  const start = tokens.indexOf("gh");
  if (start === -1) return null;
  const [group, action] = tokens.slice(start + 1);
  return group === "pr" && action === "merge"
    ? ask("Merging is the owner's decision; releases to main always need explicit approval.")
    : null;
}

const deny = (reason) => ({ decision: "deny", reason });
const ask = (reason) => ({ decision: "ask", reason });

export function evaluate(command, { currentBranch } = {}) {
  for (const rule of SQL_RULES) {
    if (rule.pattern.test(command)) return deny(rule.reason);
  }
  let pending = null;
  for (const tokens of segments(command)) {
    for (const check of [checkGit, checkSupabase, checkGh]) {
      const result = check(tokens, currentBranch);
      if (result?.decision === "deny") return result;
      pending ??= result;
    }
  }
  return pending;
}

function currentBranchIn(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    exit(0); // Unreadable input: stay out of the way and let normal permissions decide.
  }
  const command = input?.tool_input?.command;
  if (typeof command !== "string") exit(0);

  const result = evaluate(command, { currentBranch: currentBranchIn(input.cwd) });
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
