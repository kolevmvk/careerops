// Run with `pnpm test:agent`. Uses node:test so the guard has no dependencies
// and runs the same way in CI, on Linux and on macOS.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { execPath } from "node:process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { evaluate } from "./guard-bash.mjs";

const decision = (command, options) => evaluate(command, options)?.decision ?? "allow";

describe("shared database", () => {
  it("refuses db reset against a remote", () => {
    assert.equal(decision("supabase db reset --linked"), "deny");
    assert.equal(decision("pnpm exec supabase db reset --db-url postgres://x"), "deny");
    assert.equal(
      decision("DOCKER_HOST=unix:///var/run/docker.sock supabase db reset --db-url=postgres://x"),
      "deny",
    );
  });

  it("allows db reset against the local stack", () => {
    assert.equal(decision("supabase db reset"), "allow");
    assert.equal(decision("pnpm exec supabase db reset && pnpm exec supabase test db"), "allow");
  });

  it("asks before pushing migrations", () => {
    assert.equal(decision("supabase db push"), "ask");
  });

  it("refuses SQL that destroys the other application", () => {
    assert.equal(decision(`psql "$DB" -c "DROP SCHEMA public CASCADE"`), "deny");
    assert.equal(decision(`psql -c 'truncate auth.users'`), "deny");
    assert.equal(decision(`psql -c "delete from auth.users where true"`), "deny");
    assert.equal(decision(`psql -c "drop schema careerops cascade"`), "allow");
    assert.equal(decision(`psql -c "drop schema public_views"`), "allow");
  });
});

describe("git", () => {
  it("refuses pushes to protected branches", () => {
    assert.equal(decision("git push origin main"), "deny");
    assert.equal(decision("git push origin HEAD:develop"), "deny");
    assert.equal(decision("git -C ../repo push origin +refs/heads/main"), "deny");
  });

  it("refuses a bare push while standing on a protected branch", () => {
    assert.equal(decision("git push", { currentBranch: "develop" }), "deny");
    assert.equal(decision("git push", { currentBranch: "chore/agent-setup" }), "allow");
  });

  it("refuses history rewrites but allows a leased force on a feature branch", () => {
    assert.equal(decision("git push --force origin chore/x"), "deny");
    assert.equal(decision("git push -f"), "deny");
    assert.equal(decision("git push --force-with-lease origin chore/x"), "allow");
  });

  it("refuses skipping hooks and force-adding ignored files", () => {
    assert.equal(decision(`git commit --no-verify -m "wip"`), "deny");
    assert.equal(decision("git add -f private/CAREER_CONTEXT.md"), "deny");
    assert.equal(decision("git add .claude CLAUDE.md"), "allow");
  });

  it("reads commit messages as text, not as commands", () => {
    const message = `git commit -m "$(cat <<'EOF'
docs: explain why git push origin main is refused

A plain git push --force would also be refused.
EOF
)"`;
    assert.equal(decision(message), "allow");
    assert.equal(decision(`git commit -m "never run git push -f"`), "allow");
  });

  it("checks every command in a chain", () => {
    assert.equal(decision("pnpm check && git push origin main"), "deny");
  });
});

describe("pull requests", () => {
  it("asks before merging", () => {
    assert.equal(decision("gh pr merge 14 --squash"), "ask");
    assert.equal(decision("gh pr checks 14"), "allow");
  });
});

describe("hook protocol", () => {
  const script = join(dirname(fileURLToPath(import.meta.url)), "guard-bash.mjs");
  const run = (input) => spawnSync(execPath, [script], { input, encoding: "utf8" });

  it("answers a refused command with a PreToolUse decision", () => {
    const { status, stdout } = run(
      JSON.stringify({ tool_input: { command: "supabase db reset --linked" } }),
    );
    assert.equal(status, 0);
    const output = JSON.parse(stdout).hookSpecificOutput;
    assert.equal(output.hookEventName, "PreToolUse");
    assert.equal(output.permissionDecision, "deny");
    assert.match(output.permissionDecisionReason, /shared database/);
  });

  it("stays silent for an ordinary command and for malformed input", () => {
    assert.equal(run(JSON.stringify({ tool_input: { command: "pnpm check" } })).stdout, "");
    assert.equal(run("not json").stdout, "");
  });
});
