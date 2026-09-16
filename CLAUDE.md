# CareerOps - instructions for coding agents

CareerOps is a career intelligence system and, at the same time, public evidence
of how its owner builds software. Treat every file, commit and pull request as
something a hiring reviewer will read. Process is part of the product.

## Where the truth is

| Question                              | Read                                           |
| ------------------------------------- | ---------------------------------------------- |
| What the system does, phases, scope   | `docs/SPECIFICATION.md`                        |
| Entities, invariants, visibility      | `docs/DOMAIN.md`                               |
| Scoring formulas                      | `docs/SCORING.md`                              |
| Why something is the way it is        | `docs/adr/` - add an ADR for expensive choices |
| Branches, commits, definition of done | `CONTRIBUTING.md`                              |
| Local, staging, production            | `docs/ENVIRONMENTS.md`                         |

Do not restate those documents here. If this file and a document disagree, the
document wins and this file is the bug.

## What loads when

Rules in `.claude/rules/` load by themselves when you touch matching paths:
`database.md`, `api.md`, `security.md`, and `git-workflow.md` always. They are
the non-negotiables. Skills explain how to meet them and load on demand.

### Load a skill before the matching work

| Skill              | Load before                                                     |
| ------------------ | --------------------------------------------------------------- |
| `careerops-db`     | any migration, SQL, Supabase client code or career data access  |
| `privacy-consent`  | analytics, tracking, embeds, cookies, anything observing visits |
| `portfolio-design` | any public page, component, animation, style or design token    |
| `i18n`             | locales, translated strings, language detection, public content |

### Delegate to a subagent when its authority fits

| Agent              | Use                                                                 |
| ------------------ | ------------------------------------------------------------------- |
| `security-auditor` | before opening a PR touching `supabase/`, `apps/web`, `.github/`    |
| `qa-engineer`      | after a user-visible change, before calling it done                 |
| `data-researcher`  | collecting job ads or organization signals; writes only to private/ |

Implementation stays in the main session. Do not delegate work only to split it
across roles.

## Hard boundaries

These are enforced by `.claude/hooks/guard-bash.mjs` (ADR-0017), not only
requested:

- The hosted database is shared with an unrelated live application.
  `supabase db reset` runs only locally or in CI; `db push` needs the owner.
- `main` and `develop` change only through pull requests. No `--no-verify`, no
  plain force push, no `git add -f`.
- Merging a pull request is the owner's decision.

And by convention, because no tool can check them:

- `private/` may be read for context. Nothing from it is copied into a tracked
  file: no real names, employers, clients or figures. Public docs use the
  fictional demo persona.
- Tracked files are written in English.
- Never mark a claim as verified, or a fact as public, on the owner's behalf.

## Commands

```bash
pnpm install        # fetches the Node version pinned in .npmrc, installs git hooks
pnpm check          # format, lint, typecheck, test, agent guardrail tests
pnpm exec supabase start && pnpm exec supabase test db   # local database + pgTAP
```

The system Node may be older than the pinned one. Run tools through `pnpm`
(`pnpm exec`, `pnpm dlx`) rather than `npx`, which uses the system Node. On
Linux with Docker Desktop installed, the local stack may need
`DOCKER_HOST=unix:///var/run/docker.sock`.

## Working style

- Plan before large changes and wait for agreement; small fixes can go ahead.
- One logical change per commit, Conventional Commits, a body that explains why.
- Prove a claim with a test or a check in CI rather than a sentence in a doc.
- Report failures as they are. A skipped step is stated, not implied as done.

Personal preferences that should not be public belong in `CLAUDE.local.md`,
which is git-ignored.
