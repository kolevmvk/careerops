# ADR-0003: Scores as versioned snapshots computed in TypeScript

- **Status:** Accepted
- **Date:** 2026-09-15
- **References:** DOMAIN D3, D8 · SCORING §1

## Context

Scores must be explainable, reproducible and stable in history. Web and mobile both display them, and business logic must not be duplicated in Dart.

## Decision

All scoring lives in `packages/scoring` as pure functions with `SCORING_VERSION`. A server route computes and writes append-only snapshots (`skill_scores`, `job_matches`, `readiness_snapshots`) with the version and config id. Database webhooks and a nightly job trigger recomputation. Clients only read snapshots.

## Consequences

- One tested implementation; golden tests keep docs and code aligned.
- Historical application decisions remain explainable.
- Mobile writes that affect scores rely on webhooks for recomputation.
