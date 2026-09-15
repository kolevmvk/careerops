# Contributing

This is a single-maintainer project run with the same process a team would use: protected branches, pull requests, required checks and recorded decisions.

## Branching model

| Branch                                              | Purpose                               | Merges into                          | Merge method                                |
| --------------------------------------------------- | ------------------------------------- | ------------------------------------ | ------------------------------------------- |
| `main`                                              | Production. Every merge is a release. | —                                    | merge commit from `release/*` or `hotfix/*` |
| `develop`                                           | Integration. Deploys to staging.      | `main` via `release/*`               | squash                                      |
| `feature/<issue>-<slug>`                            | New capability                        | `develop`                            | squash                                      |
| `fix/<issue>-<slug>`                                | Defect fix                            | `develop`                            | squash                                      |
| `chore/…`, `docs/…`, `ci/…`, `refactor/…`, `test/…` | Maintenance                           | `develop`                            | squash                                      |
| `release/<version>`                                 | Stabilization before production       | `main`, then back-merge to `develop` | merge commit                                |
| `hotfix/<version>`                                  | Urgent production fix                 | `main` and `develop`                 | merge commit                                |

The `branch-policy` check enforces these names and targets. Direct pushes to `main` and `develop` are blocked.

## Commits and pull request titles

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`, with a lowercase subject.

```
feat(scoring): add noisy-or evidence confidence
fix(db): enforce visibility ceiling on project evidence
docs(adr): record pull-model AI worker
```

Types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `revert`. Squash merges use the PR title as the commit message, so the PR title is checked too.

Local hooks (lefthook, installed by `pnpm install`) format and lint staged files and validate commit messages.

## Definition of done for a pull request

- [ ] Required checks pass: `ci`, `actionlint`, `gitleaks`, `codeql`, `dependency-review`, `pr-title`, `branch-policy`
- [ ] Behavior changes have tests; scoring changes update golden fixtures and `SCORING_VERSION` when a formula changes
- [ ] Database changes ship as migrations with RLS policies and pgTAP tests
- [ ] Decisions that are expensive to reverse have an ADR
- [ ] No real career data, secrets or personal information anywhere in the diff

## Releases

1. Branch `release/x.y.z` from `develop` and open a PR into `main`.
2. After merge, release-please opens a release PR on `main` with the changelog and version bump.
3. Merging that PR tags `vx.y.z` and publishes a GitHub Release. The production deployment requires approval in the `production` environment.
4. Back-merge `main` into `develop`.

## Local setup

```bash
pnpm install    # also fetches the pinned Node version and installs git hooks
pnpm check      # format, lint, typecheck, test
```

Database work (from phase 1) needs Docker for the local Supabase stack.
