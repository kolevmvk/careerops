-- Evidence, its skill links, and project benchmarks (docs/DOMAIN.md §3.3,
-- §4.3, ADR-0009).

create table careerops.evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  type careerops.evidence_type not null,
  title text not null,
  description text,
  project_id uuid references careerops.projects (id),
  employment_id uuid references careerops.employments (id),
  learning_resource_id uuid references careerops.learning_resources (id),
  url text,
  storage_path text,
  occurred_from date not null,
  occurred_to date,
  source careerops.evidence_source not null default 'manual',
  verified_at timestamptz,
  visibility careerops.visibility not null default 'private',
  ai_allowed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint evidence_dates_check check (occurred_to is null or occurred_to >= occurred_from)
);
comment on table careerops.evidence is
  'A verifiable fact. Unverified rows (verified_at is null) are excluded from scoring and documents (I5).';

create trigger set_updated_at
  before update on careerops.evidence
  for each row execute function careerops.set_updated_at();

alter table careerops.evidence enable row level security;

create index evidence_user_id_idx on careerops.evidence (user_id);
create index evidence_project_id_idx on careerops.evidence (project_id);
create index evidence_employment_id_idx on careerops.evidence (employment_id);
create index evidence_learning_resource_id_idx on careerops.evidence (learning_resource_id);

create table careerops.evidence_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  evidence_id uuid not null references careerops.evidence (id) on delete cascade,
  skill_id uuid not null references careerops.skills (id) on delete cascade,
  strength smallint not null check (strength between 1 and 3),
  demonstrated_level smallint check (demonstrated_level between 0 and 5),
  rationale text,
  suggested_by careerops.evidence_suggested_by not null default 'user',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint evidence_skills_unique unique (evidence_id, skill_id)
);
comment on table careerops.evidence_skills is
  'Links evidence to a skill. Unconfirmed rows (confirmed_at is null) are excluded from scoring and documents (I5).';

create trigger set_updated_at
  before update on careerops.evidence_skills
  for each row execute function careerops.set_updated_at();

alter table careerops.evidence_skills enable row level security;

create index evidence_skills_skill_id_idx on careerops.evidence_skills (skill_id);

create table careerops.project_benchmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  project_id uuid not null references careerops.projects (id) on delete cascade,
  capability text not null,
  own_status careerops.benchmark_own_status not null,
  own_evidence_id uuid references careerops.evidence (id),
  competitor text,
  competitor_status careerops.benchmark_competitor_status not null default 'unknown',
  competitor_source_url text,
  checked_at date,
  note text,
  visibility careerops.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table careerops.project_benchmarks is
  'Feature comparison against commercial products, each row sourced (ADR-0009). '
  'Eligible as a document source only when own_evidence_id is verified and checked_at is within 180 days (I12).';

create trigger set_updated_at
  before update on careerops.project_benchmarks
  for each row execute function careerops.set_updated_at();

alter table careerops.project_benchmarks enable row level security;

create index project_benchmarks_project_id_idx on careerops.project_benchmarks (project_id);
