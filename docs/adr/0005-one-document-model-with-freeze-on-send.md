# ADR-0005: One document model with freeze-on-send

- **Status:** Accepted
- **Date:** 2026-09-15
- **References:** DOMAIN D5, I2–I4

## Context

CVs, cover letters, LinkedIn profile text, case studies, pitches and integration briefs share the same risks: invented claims, private facts leaking, and not knowing what was sent.

## Decision

All outputs use `documents`, `document_versions` and `document_sources`. Every section references verified facts that meet the kind's visibility minimum. A version freezes when it is attached to an opportunity and becomes immutable.

## Consequences

- One set of guardrails and one validator.
- Every opportunity records exactly what was sent.
