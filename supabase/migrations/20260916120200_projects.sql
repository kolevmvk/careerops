-- Projects: the proof that gets leveraged across tracks.
-- DOMAIN.md §4.3.

-- All objects are created in the careerops schema (ADR-0016), never public.
set search_path = careerops, public;

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  slug text not null,
  parent_project_id uuid references projects on delete set null,
  employment_id uuid references employments on delete set null,
  kind project_kind not null,
  role text,
  ownership project_ownership not null default 'sole',
  problem text,
  constraints text,
  solution text,
  architecture_md text,
  result text,
  operational_status operational_status not null default 'concept',
  started_at date,
  ended_at date,
  date_precision date_precision not null default 'month',
  ip_owner ip_owner not null default 'unclear',
  code_visibility code_visibility not null default 'private',
  repo_url text,
  live_url text,
  store_urls jsonb not null default '{}'::jsonb,
  visibility visibility not null default 'private',
  disclosure_status disclosure_status not null default 'not_required',
  ai_allowed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint projects_slug_unique unique (user_id, slug),
  constraint projects_not_own_parent check (parent_project_id is null or parent_project_id <> id),
  constraint projects_dates_ordered check (ended_at is null or started_at is null or ended_at >= started_at)
);

create index projects_user_idx on projects (user_id, name);
create index projects_parent_idx on projects (parent_project_id) where parent_project_id is not null;

create trigger projects_set_updated_at
  before update on projects
  for each row execute function set_updated_at();

-- DOMAIN §4.3: work owned by someone else cannot claim `not_required`.
-- The ceiling then caps it at cv_safe through the shared trigger.
create function enforce_project_ip_disclosure() returns trigger
language plpgsql
as $$
begin
  if new.ip_owner in ('employer', 'client', 'unclear')
     and new.disclosure_status = 'not_required' then
    new.disclosure_status := 'approval_required';
  end if;

  return new;
end;
$$;

comment on function enforce_project_ip_disclosure() is
  'DOMAIN §4.3. Third-party IP forces at least approval_required, so code, '
  'metrics, customers and screenshots stay out of documents until approved.';

-- Order matters and Postgres fires BEFORE triggers alphabetically, so these
-- carry numeric prefixes instead of relying on the names happening to sort
-- correctly. IP normalization must run first: it can raise disclosure_status,
-- and the ceiling check must see the raised value. With the names reversed, a
-- client-owned project inserted as portfolio_public passes the ceiling check
-- against the default not_required and lands in a state that violates I1.
create trigger projects_01_enforce_ip_disclosure
  before insert or update on projects
  for each row execute function enforce_project_ip_disclosure();

create trigger projects_02_enforce_ceiling
  before insert or update on projects
  for each row execute function enforce_disclosure_ceiling();

-- I9-style guard applied to product families: depth <= 2 and no cycles.
create function enforce_project_depth() returns trigger
language plpgsql
as $$
declare
  grandparent uuid;
begin
  if new.parent_project_id is null then
    return new;
  end if;

  select parent_project_id into grandparent
    from projects
   where id = new.parent_project_id;

  if grandparent is not null then
    raise exception 'project hierarchy is limited to two levels (DOMAIN §4.3)'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from projects
     where parent_project_id = new.id
  ) then
    raise exception 'a project with children cannot itself have a parent (DOMAIN §4.3)'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger projects_03_enforce_depth
  before insert or update of parent_project_id on projects
  for each row execute function enforce_project_depth();

alter table projects enable row level security;

create policy projects_owner on projects
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
