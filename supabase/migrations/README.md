# Migrations

Naming: `<UTC timestamp: YYYYMMDDHHMMSS>_<snake_case_description>.sql`, generated with
`pnpm exec supabase migration new <description>` so ordering and the timestamp format are
never hand-picked.

Rules:

- **Everything lives in the `careerops` schema, never `public`.** The target Supabase project
  is shared with other, unrelated projects; `public` is common ground none of them should
  assume they own. `careerops` is created in `20260918033550_shared_conventions.sql`, along with
  the grants a non-`public` schema needs that `public` gets for free (schema `USAGE`, table/
  sequence/function grants for `anon`/`authenticated`/`service_role`, via `alter default
privileges` so every later table inherits them automatically).
- **Forward-only** (see docs/OPERATIONS.md). A mistake is corrected by a new migration, never
  by editing or deleting one that already ran anywhere outside a developer's own local database.
- **One logical change per file.** Prefer several small, sequential migrations (e.g. enums,
  then the tables that use them) over one large file; it keeps `supabase db diff` reviewable
  and failures easy to bisect.
- **Every table** follows the shared convention in docs/DOMAIN.md §4: `id uuid primary key
default gen_random_uuid()`, `user_id uuid not null references auth.users default auth.uid()`,
  `created_at timestamptz not null default now()`, `updated_at timestamptz` maintained by the
  `careerops.set_updated_at()` trigger (defined in `20260918033550_shared_conventions.sql`).
- **Enable RLS on every new table immediately**, even before its policies exist, so a table is
  never briefly exposed over the API by default. Policies for all tables land together in one
  migration per ADR-0007 (one uniform `user_id = auth.uid()` pattern, tested once).
- **Forward references to tables that don't exist yet** (e.g. `employment_highlights.evidence_id`
  before `evidence` is created) are added as a plain column now and given their foreign key with
  an `alter table ... add constraint ...` migration once the referenced table exists.

`supabase db reset` loads `supabase/seed/demo.sql` after migrations, in the same database that
`supabase test db` then runs pgTAP against. The demo persona's user id (`99999999-...`) is
reserved for that reason: pgTAP fixtures use `11111111-...` / `22222222-...` and must not collide
with it (see `supabase/seed/demo.sql` and `supabase/tests/`).
