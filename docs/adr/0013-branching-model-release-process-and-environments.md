# ADR-0013: Branching model, release process and environments

- **Status:** Accepted
- **Date:** 2026-09-15
- **References:** CONTRIBUTING.md · ENVIRONMENTS.md

## Context

The repository should demonstrate a mature delivery process with controlled promotion to production.

## Decision

Gitflow-style model: protected `main` (production) and `develop` (integration), short-lived `feature/*` and `fix/*` branches merged by squash, `release/*` and `hotfix/*` into `main`. Conventional Commits, release-please for versions and changelogs. Environments: local (Docker), staging (from `develop`, doubles as public demo), production (from `main`, manual approval).

## Consequences

- Enforced by rulesets and a `branch-policy` check.
- The release PR opened by release-please uses the default token and does not trigger CI by itself; the release branch has already passed CI before reaching `main`.
