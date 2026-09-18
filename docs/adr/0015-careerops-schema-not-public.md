# ADR-0015: CareerOps owns a `careerops` schema, not `public`

- **Status:** Accepted
- **Date:** 2026-09-18
- **References:** ADR-0007 · ADR-0014

## Context

The Supabase project CareerOps deploys to is shared with other, unrelated projects on the same account, rather than being dedicated to CareerOps alone. CareerOps's table names (`profiles`, `projects`, `tasks`, `documents`, `settings`, ...) are generic enough to plausibly collide with another project's tables if everything sits in the default `public` schema of that shared database.

## Decision

Every CareerOps object — tables, enums, functions, triggers, views — lives in a dedicated `careerops` Postgres schema, created and granted to `anon`/`authenticated`/`service_role` in the first migration (`20260918033550_shared_conventions.sql`), with `alter default privileges` so every later table inherits the same grants automatically (a non-`public` schema gets none of this for free). `supabase/config.toml` exposes `careerops` to PostgREST for local development; on the shared hosted project, "careerops" is added to Project Settings → API → Exposed schemas by hand, additively, alongside whatever other projects already expose there.

`auth.users` and Supabase Auth remain shared across every project on that account — schemas separate data, not authentication. Existing migration files were edited in place rather than adding a new `alter ... set schema` migration on top, since none of them had run anywhere outside local scratch testing at the time of this change (docs/adr's forward-only rule protects databases that have actually applied a migration; none had).

## Consequences

- No table-name collisions with other projects sharing the account, regardless of what they're called.
- One more manual step per environment: the "careerops" schema must be added to that project's exposed-schemas setting by hand; nothing in this repo's CI can safely do that for a project it doesn't fully own.
- Every reference to a CareerOps object outside SQL (Supabase client calls, PostgREST requests) must state the `careerops` schema explicitly; the default (`public`) no longer resolves to anything.
