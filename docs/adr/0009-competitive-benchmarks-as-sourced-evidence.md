# ADR-0009: Competitive benchmarks as sourced evidence

- **Status:** Accepted
- **Date:** 2026-09-15
- **References:** DOMAIN D12, I12

## Context

Showing that shipped work is comparable to commercial products is persuasive and easy to overstate.

## Decision

`project_benchmarks` records capabilities with own status (backed by verified evidence) and competitor status (with a source URL and check date). Only rows meeting both conditions may appear in documents; `absent` rows are kept.

## Consequences

- Claims stay defensible in an interview.
- Benchmarks need periodic re-checking.
