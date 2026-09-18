-- Market: target roles, organizations, contacts, jobs and their
-- requirements (docs/DOMAIN.md §3.5, §4.5, ADR-0008).

create table careerops.target_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  name text not null,
  family careerops.role_family not null,
  tier careerops.role_tier not null,
  weight numeric not null check (weight between 0 and 1),
  seniority_band text,
  status careerops.role_status not null default 'active',
  positioning_note text,
  comp_floor numeric,
  comp_currency text,
  comp_period careerops.comp_period,
  comp_basis careerops.comp_basis,
  accepted_contract_types text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table careerops.target_roles is
  'Named role family with tier, weight, seniority band and compensation floor (D10).';

create trigger set_updated_at
  before update on careerops.target_roles
  for each row execute function careerops.set_updated_at();

alter table careerops.target_roles enable row level security;

create index target_roles_user_id_idx on careerops.target_roles (user_id);

create table careerops.organizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  name text not null,
  origin_country text,
  sector text,
  local_presence text,
  known_systems text,
  need_hypothesis text,
  need_signals text[] not null default '{}',
  employer_tier careerops.employer_tier,
  source_urls text[] not null default '{}',
  researched_at date,
  notes text,
  visibility careerops.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table careerops.organizations is
  'Target company researched directly (D11). researched_at makes stale research visible.';

create trigger set_updated_at
  before update on careerops.organizations
  for each row execute function careerops.set_updated_at();

alter table careerops.organizations enable row level security;

create index organizations_user_id_idx on careerops.organizations (user_id);

create table careerops.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  organization_id uuid not null references careerops.organizations (id) on delete cascade,
  name text,
  title text,
  is_role_hypothesis boolean not null default true,
  channel careerops.contact_channel,
  profile_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table careerops.contacts is
  'People or role hypotheses at an organization. Always private, never sent to AI providers.';

create trigger set_updated_at
  before update on careerops.contacts
  for each row execute function careerops.set_updated_at();

alter table careerops.contacts enable row level security;

create index contacts_organization_id_idx on careerops.contacts (organization_id);

create table careerops.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  target_role_id uuid references careerops.target_roles (id),
  organization_id uuid references careerops.organizations (id),
  company text not null,
  title text not null,
  location text,
  remote_policy careerops.remote_policy not null default 'unknown',
  seniority text,
  employment_type text,
  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  source_kind careerops.job_source_kind not null,
  source_url text,
  raw_text text not null,
  url_hash text,
  content_hash text not null,
  language text,
  posted_at date,
  imported_at timestamptz not null default now(),
  parser_version text,
  status careerops.job_status not null default 'new',
  relevance smallint check (relevance between 0 and 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint jobs_user_content_hash_unique unique (user_id, content_hash)
);
comment on table careerops.jobs is 'Imported posting. content_hash dedupes re-pasted or re-fetched ads per user.';

create trigger set_updated_at
  before update on careerops.jobs
  for each row execute function careerops.set_updated_at();

alter table careerops.jobs enable row level security;

create index jobs_target_role_id_idx on careerops.jobs (target_role_id);
create index jobs_organization_id_idx on careerops.jobs (organization_id);

create table careerops.job_requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  job_id uuid not null references careerops.jobs (id) on delete cascade,
  kind careerops.requirement_kind not null,
  skill_id uuid references careerops.skills (id),
  raw_text text not null,
  importance careerops.requirement_importance not null,
  required_level smallint check (required_level between 0 and 5),
  years numeric,
  is_hard_constraint boolean not null default false,
  mapping_status careerops.requirement_mapping_status not null default 'unmapped',
  extracted_by careerops.requirement_extracted_by not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table careerops.job_requirements is
  'Skill requirements and hard constraints extracted from a job (D6). Unmapped phrases stay in a review queue.';

create trigger set_updated_at
  before update on careerops.job_requirements
  for each row execute function careerops.set_updated_at();

alter table careerops.job_requirements enable row level security;

create index job_requirements_job_id_idx on careerops.job_requirements (job_id);
create index job_requirements_skill_id_idx on careerops.job_requirements (skill_id);
