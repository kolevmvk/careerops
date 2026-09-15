# ADR-0008: Opportunities replace applications; terms are first-class

- **Status:** Accepted
- **Date:** 2026-09-15
- **References:** DOMAIN D9, D10 · SCORING §9

## Context

The candidate pursues work both through job ads and by approaching organizations that need what they have already built. Terms (compensation floor, contract type) decide whether an opportunity is worth time.

## Decision

One `opportunities` pipeline with `track` (employment, contract, consulting) and `origin` (job ad, outreach, referral, inbound), separate `stage` and `outcome`, and expected and offered terms. Target roles carry a compensation floor, and a terms gate flags opportunities below it.

## Consequences

- Funnel metrics compare outreach with job-ad applications.
- Organizations become first-class research records.
