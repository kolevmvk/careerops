# ADR-0016: Scoring, extraction and document assembly run as Supabase Edge Functions, not a Next.js/Vercel API layer

- **Status:** Accepted
- **Date:** 2026-09-18
- **References:** SPECIFICATION §5 · ADR-0001 · ADR-0010 · ADR-0011 · ADR-0014

## Context

The original plan (ADR-0001, SPECIFICATION §5) put `packages/scoring`, `packages/extraction` and `packages/documents` — pure, versioned TypeScript business logic — behind Next.js server routes deployed on Vercel, called by a Next.js web cockpit. ADR-0014 removed that cockpit: the client is now the Ideal Planner Flutter app, in a separate repository, talking directly to this project's Supabase instance (`supabase_flutter` + Supabase Auth) with no API layer in between. SPECIFICATION §5 was left explicitly unresolved pending this decision: where do the three domain-logic packages run now that nothing in this repo serves HTTP routes?

Phase 3 needs an answer before it can build job import, requirement extraction or scoring recomputation: a deterministic, versioned TypeScript function still has to execute somewhere, be reachable from the Flutter client for on-demand calls (submit a job ad, get an extraction review), and be reachable from Postgres for orchestration (recompute a score when an evidence row changes, a nightly market-frequency refresh).

Two options were considered:

1. **Keep a slim, UI-less Vercel deployment** — same hosting as originally planned, minus the Next.js pages. Adds a second hosting account and a second Terraform provider to operate for functions that have no UI to serve.
2. **Extend the AI worker's pull model (ADR-0011)** to also run scoring/extraction — the home-network worker already polls Postgres for pending `ai_analyses` work. Rejected: that pattern exists specifically to keep the home network unreachable from the internet while it drives a local GPU (Ollama). Scoring and extraction have no GPU dependency and need interactive latency (a user pastes a job ad and waits for the extraction review, or edits evidence and expects a score to update) — routing them through a home-network poll loop adds latency and an unrelated availability dependency for no benefit.

## Decision

`packages/scoring`, `packages/extraction` and `packages/documents` run as Supabase Edge Functions (Deno) inside this project's own Supabase instance, not as Next.js/Vercel server routes and not through the AI worker.

- The Flutter client calls Edge Functions directly (`supabase_flutter`'s `functions.invoke`) for on-demand work: job import and extraction review, on-demand score recompute, document assembly.
- Database webhooks and `pg_cron` call Edge Functions over HTTP for orchestration: recompute-on-change and nightly jobs (SPECIFICATION §5.2's "Orchestration" row), replacing the Next.js API routes that row assumed.
- The packages themselves stay dependency-free, framework-agnostic TypeScript (as `packages/scoring` already is) so they run under Deno without change; Edge Functions are a thin invocation wrapper around them, not a rewrite target.
- No Vercel account, project or Terraform provider is needed for v0.1. `infra/` targets Supabase (and AWS for backups) only.

This does not change where rules live (SPECIFICATION §5.2): integrity/ownership/visibility/freeze rules stay in Postgres constraints, triggers and RLS; scoring/extraction/document assembly stay versioned TypeScript. It changes only which process runs that TypeScript.

## Consequences

- One platform to operate (Supabase) instead of two; no second hosting account, deploy pipeline or Terraform provider for v0.1.
- Edge Functions run on Deno: `packages/scoring` and siblings must stay free of Node-only APIs to keep running unmodified there; this is already true and becomes a constraint to preserve going forward, not a rewrite.
- Cold starts and per-invocation limits are a Supabase Edge Functions concern instead of a Vercel one — acceptable for v0.1's scale (single user, no public traffic) and revisited if phase 9's public demo changes that.
- SPECIFICATION §5's architecture diagram and §5.1's technology baseline still describe a Next.js/Vercel API layer and need a follow-up documentation update (tracked the same way ADR-0014's equivalent §13 follow-up was, in PR #24).
- A future public web cockpit (phase 9) can still call the same Edge Functions; this decision does not foreclose adding a web client later, only removes the assumption that Vercel hosts the domain logic.
