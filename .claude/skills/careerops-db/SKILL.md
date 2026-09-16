---
name: careerops-db
description: Rules for touching the CareerOps database - schema placement, RLS, migrations and the commands that must never run. Load before writing any migration, SQL, Supabase client code, or anything that reads or writes career data.
---

# CareerOps database rules

The database is shared with a live e-commerce application that has real
customers. Most rules here exist because of that, and breaking one damages
something outside this project.

## Never

- **Never run `supabase db reset` against a linked remote.** It drops
  everything, including the other application. It is a local command and a CI
  command against a throwaway container. Migrations reach a remote only through
  `supabase db push`, which is additive.
- **Never create objects in `public`.** Every table, view, function, trigger and
  enum belongs to the `careerops` schema.
- **Never ship a table without row level security.** The `db` workflow fails the
  build for it, and a table without RLS is readable by anyone holding the anon
  key.
- **Never grant `anon` anything beyond `usage` on the schema** plus select on
  the two public views. If a new public surface is needed, add a view with an
  explicit WHERE clause, not a table grant.
- **Never run the demo seed anywhere `auth.users` already has accounts.** The
  guard in `supabase/seed/demo.sql` enforces this; do not weaken it.

## Always

- Start every migration with `set search_path = careerops, public;` rather than
  qualifying identifiers by hand. Keep `auth.` and `extensions.` qualified.
- Put integrity, ownership, visibility ceilings and freeze rules in Postgres
  (constraints, triggers, RLS). Application-side checks are a convenience; the
  database is the authority.
- Name triggers with numeric prefixes when order matters. Postgres fires BEFORE
  triggers alphabetically, and relying on names happening to sort correctly has
  already caused one real bug (`projects_01_`, `_02_`, `_03_`).
- Add a pgTAP test for every invariant. Scope assertions to the test's own
  fixture; the demo seed contributes rows and a test that assumes an empty
  database breaks the moment the seed grows.
- Regenerate types after a schema change:
  `supabase gen types typescript --local --schema careerops`.

## Client code

Every Supabase client must name the schema explicitly, or it silently targets
`public` and finds nothing:

```ts
createServerClient<Database>(url, key, { db: { schema: "careerops" } })
```

Over REST the equivalent headers are `Accept-Profile` and `Content-Profile`.

The service-role key belongs only in server environments and CI, never in
`NEXT_PUBLIC_*`, never in the mobile app, never in a public page.

## Visibility

Ordered: `private` < `cv_safe` < `portfolio_public`, capped by
`disclosure_status` and by the parent row. `ip_owner` of `employer`, `client` or
`unclear` forces `approval_required`, which caps at `cv_safe` — work cannot be
published until its owner claims it.

Unverified facts are not facts. They never reach a document or a public surface.

## References

- `docs/adr/0016-careerops-owns-one-schema-in-a-shared-database.md`
- `docs/DOMAIN.md` §5 (visibility), §6 (invariants)
- `docs/ENVIRONMENTS.md`
