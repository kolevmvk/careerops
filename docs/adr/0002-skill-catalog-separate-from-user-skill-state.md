# ADR-0002: Skill catalog separate from user skill state

- **Status:** Accepted
- **Date:** 2026-09-15
- **References:** DOMAIN D1, D2

## Context

Job postings require skills the user does not track yet, and those are exactly the gaps. Postings also mix granularity ("AWS" versus "IAM"), and transferable practices such as release engineering matter as much as technologies.

## Decision

`skills` is a catalog (kind, category, optional parent with depth ≤ 2, aliases). `user_skills` and append-only `skill_assessments` hold the user's state. Job requirements reference the catalog.

## Consequences

- Gaps can be represented without fake user state.
- Deterministic extraction works through `skill_aliases`.
- Matching needs roll-up rules for the hierarchy (SCORING §4.1).
