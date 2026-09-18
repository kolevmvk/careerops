# ADR-0014: CareerOps ships inside the existing Ideal Planner app, not a new client

- **Status:** Accepted
- **Date:** 2026-09-18
- **References:** SPECIFICATION §13 · ADR-0001 · ADR-0011 · ADR-0012

## Context

The original plan (ADR-0001, SPECIFICATION §13) builds a Next.js web cockpit from phase 2 and a Flutter companion from phase 7, both inside this monorepo. A mature, actively developed Flutter app already exists in a separate private repository, `kolevmvk/Ideal-Planer`: a personal productivity client with its own screens (NOW/QUEUE/DAY/PROJECTS/DUMP/REVIEW, chat, team), offline-first local storage (Drift/SQLite), and on-device AI (`flutter_gemma`). Its own roadmap plans a self-hosted backend (FastAPI, a master SQLite, n8n, Telegram, reached over Tailscale from a home Mac Mini) for its own task/planner domain.

Building a second client from scratch, web or mobile, duplicates a UI shell, navigation and theming that already exist and work, for no benefit to CareerOps's own domain.

## Decision

CareerOps ships as new screens inside the Ideal Planner app instead of a new `apps/web` or `apps/mobile` client in this repository. Those screens are a self-contained feature module that authenticates against and talks directly to CareerOps's own Supabase project (`supabase_flutter` + Supabase Auth), independent of Ideal Planner's Drift/SQLite task data and independent of its planned FastAPI/Mac-Mini backend. No shared schema and no data flows between the two domains: Ideal Planner's tasks and projects are not CareerOps's `tasks` and `projects`, and nothing routes through n8n or the Mac Mini (consistent with ADR-0010's "fewer moving parts" and ADR-0011's queue-based, optional-AI design, which this does not need to change).

This amends ADR-0001's scope: the mobile client moves out of this monorepo. Everything else ADR-0001 covers (TypeScript packages, the scoring/extraction/documents packages, the AI worker, Terraform) is unaffected, and a public web cockpit remains possible later (phase 9's public demo, in particular) without conflicting with this decision.

## Consequences

- Faster path to a usable client: existing navigation, theming and local-AI infrastructure are reused as-is.
- Two repositories to coordinate instead of one. A migration in this repo that changes a column the Flutter screens depend on needs a follow-up PR in `Ideal-Planer`; ADR-0001's "atomic changes across schema, domain logic and clients" no longer holds for the client.
- ADR-0012's "public code, private data" now covers this repo's schema, backend logic and CI; the client engineering lives in a repo that is currently private. Whether to open-source that module later is a separate decision, not made here.
- The Flutter app needs its own CareerOps sign-in (Supabase Auth), distinct from Ideal Planner's offline-first single-local-user model.
- docs/SPECIFICATION.md §13's repository layout and phase table describe a mobile client built in this repo; they are now inaccurate for the client and need a follow-up documentation update.
