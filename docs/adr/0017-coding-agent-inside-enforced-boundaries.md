# ADR-0017: The coding agent works inside enforced boundaries

- **Status:** Accepted
- **Date:** 2026-09-16
- **References:** CONTRIBUTING.md · CLAUDE.md · ADR-0012 · ADR-0013 · ADR-0016

## Context

Most changes in this repository are written with an AI coding agent (Claude
Code) operating in the owner's terminal with the owner's credentials. That
agent can run anything the owner can: push to GitHub, run the Supabase CLI
against the hosted project, read local secrets.

Three facts make that more than a theoretical concern.

**The database is shared** (ADR-0016). A single `supabase db reset --linked`
destroys an unrelated live application with real customers. Unlike a push to
`main`, nothing on the server side refuses it.

**The repository is public and the data is not** (ADR-0012). `private/` sits
next to the code on disk. `.gitignore` is the only thing between it and a
commit, and `git add -f` walks straight past it.

**Instructions are not enforcement.** An agent told in prose never to do
something will usually comply, and "usually" is the wrong reliability for an
irreversible action. The same is true of people, which is why branch protection
exists instead of a sentence in CONTRIBUTING.

## Decision

The agent's configuration is committed, reviewed and tested like the rest of the
code, in layers with different jobs.

**Context: `CLAUDE.md` and project skills.** `CLAUDE.md` is a short index: where
the truth lives, what loads when, and the boundaries. It points to documents
instead of restating them, so it cannot drift from them silently.

The rest of the context is split by how reliably it has to arrive:

- **Rules** (`.claude/rules/`) are short lists of non-negotiables. Each is
  scoped by path and loads automatically when the agent works on matching files:
  `database.md` for `supabase/**`, `api.md` for the web app's server code,
  `security.md` for everything that ships. Loading does not depend on the agent
  deciding the rule is relevant.
- **Skills** (`.claude/skills/`) carry the procedure and the reasoning for one
  domain (database, privacy, design, localisation). They are longer, so they
  load on demand, and a rule names the skill that explains it.

A skill is added in the pull request that introduces what it describes. A skill
for a deployment target or a network that does not exist yet is speculation,
and it would teach the agent about a system that is not there.

**Delegation: subagents with narrower authority.** A subagent starts without the
conversation's context, so splitting implementation across role personas that
have the same model and tools adds a handoff and no capability. An agent is
defined only where it differs in what it may do:

| Agent              | Authority                                     | Job                                                  |
| ------------------ | --------------------------------------------- | ---------------------------------------------------- |
| `security-auditor` | read and shell, no editing tools              | review a diff against the database and privacy rules |
| `qa-engineer`      | everything except editing, including browser  | prove a change works: checks, build, real browser    |
| `data-researcher`  | web and file tools; writes only in `private/` | sourced research on job ads and organizations        |

A reviewer that cannot edit reports what it finds instead of quietly fixing it,
which keeps the finding visible. The researcher's write boundary is enforced by
its own hook, `guard-private-write.mjs`, which fails closed.

**Enforcement: a `PreToolUse` hook.** `.claude/hooks/guard-bash.mjs` inspects
every shell command before it runs, including those run by subagents, and
refuses or escalates the ones that can cause irreversible damage here:

| Command                                             | Decision |
| --------------------------------------------------- | -------- |
| `supabase db reset` with `--linked` or `--db-url`   | refuse   |
| SQL dropping `public` or deleting from `auth.users` | refuse   |
| push to `main` or `develop`, plain force, `--all`   | refuse   |
| `--no-verify`, `git add -f`                         | refuse   |
| `supabase db push`, `gh pr merge`                   | ask      |

The guard reads commands as a shell would: quoted strings and heredoc bodies are
text, so a commit message that mentions a forbidden command is not refused. It
is a Node script with no dependencies, so it runs identically on Linux and
macOS, and its behaviour is pinned by `node:test` cases that run in CI.

**Permissions: `.claude/settings.json`.** An allowlist for read-only and
verification commands, so the agent is not interrupted for `pnpm check`, and a
denylist for reading local secret files.

Machine-specific tooling, such as the browser MCP server used to measure the
public pages, stays in local scope and is documented rather than committed.

## Consequences

- A reviewer can see exactly what the agent is allowed to do by reading
  `.claude/settings.json` and the agent definitions, and can check that the
  most dangerous rules actually hold by running `pnpm test:agent`.
- Removing editing tools from an agent does not make its shell read-only. The
  auditor and the QA agent could still write through the shell; their
  instructions forbid it and the shell guard still applies, but that boundary
  is weaker than the researcher's, which a hook enforces.
- Rules and skills overlap on purpose: a rule is the part that must always be
  in context, a skill is the explanation. When one changes, the other is
  checked in the same pull request.
- The guard is a pattern match, not a sandbox. A determined bypass (a command
  built at runtime, a script file that runs the CLI) will get past it. It
  exists to stop the plausible mistake, not an adversary; the adversarial
  controls remain branch protection, required checks, gitleaks and least
  privilege on credentials.
- If `node` is not on the `PATH` the hook fails open and only the permission
  prompts remain. `pnpm install` makes that unlikely on any machine that can
  build the project.
- Rules that no tool can check - nothing from `private/` in tracked files, no
  claim marked verified on the owner's behalf - stay conventions in
  `CLAUDE.md`. Revisit when a check becomes possible, for example a scan for
  names listed in a private denylist.
- New irreversible operations (Terraform apply, production deploys, backup
  deletion) add a rule and a test in the same pull request that introduces them.
