-- Market: target roles with their compensation floor, and the ad corpus.
-- DOMAIN.md §4.5. Intake lanes are SPECIFICATION §7.

-- All objects are created in the careerops schema (ADR-0016), never public.
set search_path = careerops, public;

create table target_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  tier role_tier not null default 'primary',
  weight numeric not null default 1.0,
  seniority_band text,
  status text not null default 'active',
  positioning_note text,
  comp_floor numeric,
  comp_currency text,
  comp_period comp_period not null default 'month',
  comp_basis comp_basis not null default 'b2b_invoice',
  accepted_contract_types contract_type[] not null default '{b2b_contract}',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint target_roles_weight_range check (weight >= 0 and weight <= 1),
  constraint target_roles_floor_needs_currency
    check (comp_floor is null or comp_currency is not null)
);

create table organizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  origin_country text,
  sector text,
  local_presence text,
  known_systems text,
  need_hypothesis text,
  need_signals text[] not null default '{}',
  source_urls text[] not null default '{}',
  researched_at date,
  notes text,
  visibility visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index organizations_user_idx on organizations (user_id, name);

-- One row per ad, whichever lane it arrived on (SPECIFICATION §7.1).
create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  target_role_id uuid references target_roles on delete set null,
  organization_id uuid references organizations on delete set null,
  company text not null,
  title text not null,
  location text,
  remote_policy remote_policy not null default 'unknown',
  seniority text,
  employment_type text,
  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  source_kind job_source_kind not null default 'paste',
  source_url text,
  raw_text text not null,
  url_hash text,
  content_hash text not null,
  language text,
  posted_at date,
  imported_at timestamptz not null default now(),
  parser_version text,
  status job_status not null default 'new',
  relevance smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint jobs_relevance_range check (relevance is null or relevance between 0 and 2),
  constraint jobs_salary_ordered
    check (salary_min is null or salary_max is null or salary_max >= salary_min),
  -- Dedupe is per user and per normalized content, so the same ad arriving on
  -- lane A and lane B lands once (SPECIFICATION §7.1).
  constraint jobs_content_unique unique (user_id, content_hash)
);

create index jobs_user_imported_idx on jobs (user_id, imported_at desc);
create index jobs_relevance_idx on jobs (user_id, relevance) where relevance is not null;
create unique index jobs_url_unique on jobs (user_id, url_hash) where url_hash is not null;

create trigger target_roles_set_updated_at
  before update on target_roles
  for each row execute function set_updated_at();

create trigger organizations_set_updated_at
  before update on organizations
  for each row execute function set_updated_at();

create trigger jobs_set_updated_at
  before update on jobs
  for each row execute function set_updated_at();

alter table target_roles enable row level security;
alter table organizations enable row level security;
alter table jobs enable row level security;

create policy target_roles_owner on target_roles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy organizations_owner on organizations
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy jobs_owner on jobs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
