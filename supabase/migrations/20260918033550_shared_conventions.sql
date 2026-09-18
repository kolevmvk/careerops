-- Shared conventions for every table in this schema (see docs/DOMAIN.md §4):
--   id uuid primary key default gen_random_uuid()
--   user_id uuid not null references auth.users, default auth.uid()
--   created_at timestamptz not null default now()
--   updated_at timestamptz, maintained by the trigger below
--
-- Extensions and the updated_at trigger are set up once here; every later
-- migration that creates a table attaches set_updated_at to it directly.
--
-- Everything CareerOps owns lives in its own `careerops` schema, not
-- `public`: the target Supabase project is shared with other, unrelated
-- projects, and `public` is common ground none of them should assume they
-- own. Unlike `public`, a new schema gets no default PostgREST exposure or
-- role grants, so both are set up explicitly below and via `alter default
-- privileges` so every table created afterwards inherits them automatically.

create schema if not exists careerops;

grant usage on schema careerops to anon, authenticated, service_role;

alter default privileges in schema careerops
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema careerops
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema careerops
  grant execute on functions to anon, authenticated, service_role;

create extension if not exists pgcrypto with schema extensions;

create function careerops.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function careerops.set_updated_at() is
  'Sets updated_at = now() on every row update. Attached as a BEFORE UPDATE trigger per table.';
