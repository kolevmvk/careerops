---
paths:
  - "supabase/**"
  - "**/*.sql"
  - "apps/web/lib/supabase/**"
  - "apps/web/lib/database.types.ts"
---

# Database

The hosted Supabase project is shared with an unrelated live application
(ADR-0016). These hold for every change under `supabase/` and every Supabase
client. Load the `careerops-db` skill for how to apply them.

- Every object lives in the `careerops` schema. Nothing is created in `public`.
- Every table ships with row level security and a pgTAP test for each policy
  and invariant, in the same commit.
- `anon` gets `usage` on the schema and select on the public views, nothing
  else. A new public surface is a new view with an explicit `WHERE`.
- Migrations are append-only. An applied migration is never edited; a mistake
  is corrected by the next one.
- `supabase db reset` is local and CI only. `db push` is the owner's call.
- Every client names the schema: `db: { schema: "careerops" }`.
- After a schema change, regenerate `apps/web/lib/database.types.ts`.
