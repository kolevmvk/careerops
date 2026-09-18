-- Market: target roles, organizations, contacts, jobs and their
-- requirements (docs/DOMAIN.md §3.5, §4.5, ADR-0008).

create table public.target_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  name text not null,
  family public.role_family not null,
  tier public.role_tier not null,
  weight numeric not null check (weight between 0 and 1),
  seniority_band text,
  status public.role_status not null default 'active',
  positioning_note text,
  comp_floor numeric,
  comp_currency text,
  comp_period public.comp_period,
  comp_basis public.comp_basis,
  accepted_contract_types text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table public.target_roles is
  'Named role family with tier, weight, seniority band and compensation floor (D10).';

create trigger set_updated_at
  before update on public.target_roles
  for each row execute function public.set_updated_at();

alter table public.target_roles enable row level security;

create index target_roles_user_id_idx on public.target_roles (user_id);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  name text not null,
  origin_country text,
  sector text,
  local_presence text,
  known_systems text,
  need_hypothesis text,
  need_signals text[] not null default '{}',
  employer_tier public.employer_tier,
  source_urls text[] not null default '{}',
  researched_at date,
  notes text,
  visibility public.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table public.organizations is
  'Target company researched directly (D11). researched_at makes stale research visible.';

create trigger set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;

create index organizations_user_id_idx on public.organizations (user_id);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text,
  title text,
  is_role_hypothesis boolean not null default true,
  channel public.contact_channel,
  profile_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table public.contacts is
  'People or role hypotheses at an organization. Always private, never sent to AI providers.';

create trigger set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

alter table public.contacts enable row level security;

create index contacts_organization_id_idx on public.contacts (organization_id);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  target_role_id uuid references public.target_roles (id),
  organization_id uuid references public.organizations (id),
  company text not null,
  title text not null,
  location text,
  remote_policy public.remote_policy not null default 'unknown',
  seniority text,
  employment_type text,
  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  source_kind public.job_source_kind not null,
  source_url text,
  raw_text text not null,
  url_hash text,
  content_hash text not null,
  language text,
  posted_at date,
  imported_at timestamptz not null default now(),
  parser_version text,
  status public.job_status not null default 'new',
  relevance smallint check (relevance between 0 and 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint jobs_user_content_hash_unique unique (user_id, content_hash)
);
comment on table public.jobs is 'Imported posting. content_hash dedupes re-pasted or re-fetched ads per user.';

create trigger set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;

create index jobs_target_role_id_idx on public.jobs (target_role_id);
create index jobs_organization_id_idx on public.jobs (organization_id);

create table public.job_requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  kind public.requirement_kind not null,
  skill_id uuid references public.skills (id),
  raw_text text not null,
  importance public.requirement_importance not null,
  required_level smallint check (required_level between 0 and 5),
  years numeric,
  is_hard_constraint boolean not null default false,
  mapping_status public.requirement_mapping_status not null default 'unmapped',
  extracted_by public.requirement_extracted_by not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table public.job_requirements is
  'Skill requirements and hard constraints extracted from a job (D6). Unmapped phrases stay in a review queue.';

create trigger set_updated_at
  before update on public.job_requirements
  for each row execute function public.set_updated_at();

alter table public.job_requirements enable row level security;

create index job_requirements_job_id_idx on public.job_requirements (job_id);
create index job_requirements_skill_id_idx on public.job_requirements (skill_id);
