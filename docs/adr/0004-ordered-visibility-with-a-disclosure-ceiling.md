# ADR-0004: Ordered visibility with a disclosure ceiling

- **Status:** Accepted
- **Date:** 2026-09-15
- **References:** DOMAIN §5, D4, D11

## Context

Career facts range from private notes to public case studies. Some facts also belong to a third party (an employer, a client, a restricted organization), whose position limits what the user may publish.

## Decision

Visibility is ordered: `private` < `cv_safe` < `portfolio_public`. `disclosure_status` caps it (`approval_required` and `restricted` cap at `cv_safe`). Effective visibility is also capped by the parent employment or project. Postgres triggers enforce the ceiling; restricted operational details are never stored.

## Consequences

- Leaks are prevented at write time, not only filtered at read time.
- Publishing a case study may require recording third-party approval first.
