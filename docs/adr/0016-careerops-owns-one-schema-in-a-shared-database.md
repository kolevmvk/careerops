# ADR-0016: CareerOps owns one schema in a shared database

- **Status:** Accepted
- **Date:** 2026-09-16
- **References:** SPECIFICATION §10.2 · ENVIRONMENTS.md · ADR-0007 · ADR-0012

## Context

The plan assumed two dedicated Supabase projects, `careerops-staging` and `careerops-production`. The owner instead runs CareerOps inside an existing Supabase project that already hosts a live e-commerce application with real customers.

That changes three things at once.

**Name collisions are likely, not hypothetical.** The schema creates `profiles`, `jobs`, `documents`, `projects` and `organizations`. `profiles` is the single most common table in any Supabase project, and a storefront plausibly owns several of the others. A migration that collides fails loudly, which is the good outcome; the bad outcome is attaching to a table that already exists and corrupting someone else's data.

**`auth.users` is not empty and not ours.** It holds the store's customers. The demo seed inserts an auth account, so running it there would put a fictional user among real ones.

**Destructive commands now have blast radius.** `supabase db reset` drops and recreates everything. Against a shared project it destroys an application that has nothing to do with this one.

## Decision

**All CareerOps objects live in a `careerops` schema.** Nothing is created in `public`. Migrations set `search_path = careerops, public` rather than qualifying several hundred identifiers by hand, which is both more readable and less error-prone; references to `auth` and `extensions` stay explicitly qualified.

**Grants are explicit and asymmetric.** `public` receives its Data API grants from Supabase automatically; a schema created by a migration does not, so `20260916120600_schema_grants.sql` grants them. `authenticated` gets table privileges and row level security decides which rows it sees — a signed-in customer of the other application matches no `user_id` and reads nothing. `anon` gets `usage` on the schema and no table privileges at all, so an unauthenticated caller is refused at the privilege layer before any policy runs.

**The demo seed refuses to run where accounts already exist.** The guard is emptiness of `auth.users`, not hostname or port: a hosted project and the local container are indistinguishable by both. Any database holding accounts is not a place for a demo persona, wherever it runs.

**Sign-ups stay disabled through the global `enable_signup` flag.** Setting `[auth.email] enable_signup = false` in the current CLI disables the email provider outright, which stops sign-in too. Both properties are asserted rather than assumed: an existing account signs in, and `/auth/v1/signup` returns `signup_disabled`.

**`supabase db reset` is never run against the shared project.** It is a local command and a CI command against a throwaway container.

## Consequences

- Every client must ask for the schema explicitly: `db: { schema: "careerops" }` in the Supabase clients, `--schema careerops` when generating types, `Accept-Profile: careerops` over REST. A caller that forgets silently targets `public` and finds nothing, which is a confusing failure rather than a dangerous one.
- The whole system is revocable with `drop schema careerops cascade`, which is a real operational benefit over having been mixed into `public`.
- Two applications now share a connection limit, a Postgres version and a maintenance window. Outgrowing that means moving to a dedicated project, and the schema boundary makes the move a dump and restore of one schema rather than an untangling.
- The `db` workflow asserts row level security over `careerops`, not `public`, or it would pass vacuously.
- Backups of the shared project now contain career data. Retention and access for that project are no longer only the other application's concern.
- Revisit when CareerOps justifies its own project, or if the shared project's Postgres version, extensions or connection limits start constraining either side.
