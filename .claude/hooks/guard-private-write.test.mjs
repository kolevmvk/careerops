import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { env, execPath } from "node:process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { evaluateWrite } from "./guard-private-write.mjs";

const project = "/work/careerops";
const decision = (path) => evaluateWrite(path, project)?.decision ?? "allow";

describe("private writes", () => {
  it("allows files inside private/", () => {
    assert.equal(decision("/work/careerops/private/organizations/acme.md"), "allow");
    assert.equal(decision("private/job-corpus/2026-09-17-platform-engineer.md"), "allow");
  });

  it("refuses tracked locations and escapes", () => {
    assert.equal(decision("/work/careerops/docs/notes.md"), "deny");
    assert.equal(decision("private/../docs/notes.md"), "deny");
    assert.equal(decision("/work/careerops/private"), "deny");
    assert.equal(decision("/work/careerops/private-notes/acme.md"), "deny");
    assert.equal(decision("/tmp/acme.md"), "deny");
  });

  it("refuses a write it cannot check", () => {
    assert.equal(decision(undefined), "deny");
    assert.equal(decision(""), "deny");
  });
});

describe("hook protocol", () => {
  const script = join(dirname(fileURLToPath(import.meta.url)), "guard-private-write.mjs");
  const run = (input) =>
    spawnSync(execPath, [script], {
      input,
      encoding: "utf8",
      env: { ...env, CLAUDE_PROJECT_DIR: project },
    });

  it("refuses a write outside private/ and allows one inside", () => {
    const refused = run(JSON.stringify({ tool_input: { file_path: "/work/careerops/README.md" } }));
    assert.equal(JSON.parse(refused.stdout).hookSpecificOutput.permissionDecision, "deny");

    const allowed = run(
      JSON.stringify({ tool_input: { file_path: "/work/careerops/private/a.md" } }),
    );
    assert.equal(allowed.stdout, "");
  });

  it("fails closed on malformed input", () => {
    assert.equal(JSON.parse(run("not json").stdout).hookSpecificOutput.permissionDecision, "deny");
  });
});
