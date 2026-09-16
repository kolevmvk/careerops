-- Career history: the canonical employment record every CV guardrail depends on.
-- DOMAIN.md §4.1.

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users on delete cascade,
  full_name text,
  headline text,
  summary text,
  location text,
  timezone text,
  remote_preference remote_policy not null default 'remote',
  open_to_relocation boolean not null default false,
  work_authorization text[] not null default '{}',
  public_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table employments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  organization text not null,
  public_organization text,
  title text not null,
  public_title text,
  employment_type employment_type not null,
  start_date date not null,
  end_date date,
  date_precision date_precision not null default 'month',
  location text,
  summary text,
  visibility visibility not null default 'private',
  disclosure_status disclosure_status not null default 'not_required',
  ai_allowed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint employments_dates_ordered check (end_date is null or end_date >= start_date)
);

create index employments_user_start_idx on employments (user_id, start_date desc);

create table employment_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  employment_id uuid not null references employments on delete cascade,
  text text not null,
  visibility visibility not null default 'private',
  verified_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index employment_highlights_employment_idx
  on employment_highlights (employment_id, sort_order);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger employments_set_updated_at
  before update on employments
  for each row execute function set_updated_at();

create trigger employment_highlights_set_updated_at
  before update on employment_highlights
  for each row execute function set_updated_at();

create trigger employments_enforce_ceiling
  before insert or update on employments
  for each row execute function enforce_disclosure_ceiling();

-- I1, parent half: a highlight never travels further than its employment.
create function enforce_highlight_ceiling() returns trigger
language plpgsql
as $$
declare
  parent_visibility visibility;
  parent_status disclosure_status;
  ceiling visibility;
begin
  select e.visibility, e.disclosure_status
    into parent_visibility, parent_status
    from employments e
   where e.id = new.employment_id;

  ceiling := least(parent_visibility, disclosure_ceiling(parent_status));

  if new.visibility > ceiling then
    raise exception
      'highlight visibility % exceeds the employment ceiling of % (DOMAIN I1)',
      new.visibility, ceiling
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger employment_highlights_enforce_ceiling
  before insert or update on employment_highlights
  for each row execute function enforce_highlight_ceiling();

-- A change to the parent must not silently strand children above the new ceiling.
create function reclamp_highlights_on_employment_change() returns trigger
language plpgsql
as $$
declare
  ceiling visibility;
begin
  ceiling := least(new.visibility, disclosure_ceiling(new.disclosure_status));

  update employment_highlights
     set visibility = ceiling
   where employment_id = new.id
     and visibility > ceiling;

  return new;
end;
$$;

create trigger employments_reclamp_highlights
  after update of visibility, disclosure_status on employments
  for each row execute function reclamp_highlights_on_employment_change();

alter table profiles enable row level security;
alter table employments enable row level security;
alter table employment_highlights enable row level security;

create policy profiles_owner on profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy employments_owner on employments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy employment_highlights_owner on employment_highlights
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
