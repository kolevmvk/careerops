# ADR-0011: Local AI through a pull-model worker

- **Status:** Accepted
- **Date:** 2026-09-15
- **References:** SPECIFICATION §9

## Context

Local inference (Ollama) runs on a home server reachable only over a private Tailscale network. Vercel functions and Supabase Edge Functions cannot reach it.

## Decision

The server enqueues `ai_analyses` rows containing ids only. A containerized worker on the private network claims jobs using a dedicated database role limited to `ai_context_*` views and the queue table, calls the model and writes results. It never holds the service-role key.

## Consequences

- No inbound exposure of the home network.
- AI is asynchronous and optional; the product works when the worker is offline.
