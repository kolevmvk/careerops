# ADR-0007: `user_id` on every row; the demo is a separate project

- **Status:** Accepted
- **Date:** 2026-09-15
- **References:** DOMAIN D7 · ENVIRONMENTS

## Context

The product is single-user, but it needs a public demo and a uniform security model.

## Decision

Every table, including catalog tables, carries `user_id` with the same RLS policy (`user_id = auth.uid()`). The public demo runs as a separate Supabase project (staging) with a fictional persona, not as a second tenant in production.

## Consequences

- One RLS pattern that is easy to test.
- Production never contains demo users, and the demo never contains real data.
