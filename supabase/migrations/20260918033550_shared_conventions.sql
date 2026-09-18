-- Shared conventions for every table in this schema (see docs/DOMAIN.md §4):
--   id uuid primary key default gen_random_uuid()
--   user_id uuid not null references auth.users, default auth.uid()
--   created_at timestamptz not null default now()
--   updated_at timestamptz, maintained by the trigger below
--
-- Extensions and the updated_at trigger are set up once here; every later
-- migration that creates a table attaches set_updated_at to it directly.

create extension if not exists pgcrypto with schema extensions;

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Sets updated_at = now() on every row update. Attached as a BEFORE UPDATE trigger per table.';
