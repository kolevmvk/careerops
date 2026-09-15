# ADR-0006: Hard constraints as a separate gate

- **Status:** Accepted
- **Date:** 2026-09-15
- **References:** DOMAIN D6 · SCORING §5.3

## Context

Language, location, work authorization, clearance and mandatory certifications are pass or fail. Blending them into a percentage hides blockers.

## Decision

Extract constraints into `job_requirements` with `is_hard_constraint`. Evaluate them into `constraint_gate` (`pass`, `warn`, `fail`, `unknown`), shown next to the match score, never subtracted from it.

## Consequences

- A high match that is blocked is visible as blocked.
- Some constraints need manual confirmation in v0.1.
