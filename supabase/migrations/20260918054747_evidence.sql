-- Evidence, its skill links, and project benchmarks (docs/DOMAIN.md §3.3,
-- §4.3, ADR-0009).

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  type public.evidence_type not null,
  title text not null,
  description text,
  project_id uuid references public.projects (id),
  employment_id uuid references public.employments (id),
  learning_resource_id uuid references public.learning_resources (id),
  url text,
  storage_path text,
  occurred_from date not null,
  occurred_to date,
  source public.evidence_source not null default 'manual',
  verified_at timestamptz,
  visibility public.visibility not null default 'private',
  ai_allowed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint evidence_dates_check check (occurred_to is null or occurred_to >= occurred_from)
);
comment on table public.evidence is
  'A verifiable fact. Unverified rows (verified_at is null) are excluded from scoring and documents (I5).';

create trigger set_updated_at
  before update on public.evidence
  for each row execute function public.set_updated_at();

alter table public.evidence enable row level security;

create index evidence_user_id_idx on public.evidence (user_id);
create index evidence_project_id_idx on public.evidence (project_id);
create index evidence_employment_id_idx on public.evidence (employment_id);
create index evidence_learning_resource_id_idx on public.evidence (learning_resource_id);

create table public.evidence_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  evidence_id uuid not null references public.evidence (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  strength smallint not null check (strength between 1 and 3),
  demonstrated_level smallint check (demonstrated_level between 0 and 5),
  rationale text,
  suggested_by public.evidence_suggested_by not null default 'user',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint evidence_skills_unique unique (evidence_id, skill_id)
);
comment on table public.evidence_skills is
  'Links evidence to a skill. Unconfirmed rows (confirmed_at is null) are excluded from scoring and documents (I5).';

create trigger set_updated_at
  before update on public.evidence_skills
  for each row execute function public.set_updated_at();

alter table public.evidence_skills enable row level security;

create index evidence_skills_skill_id_idx on public.evidence_skills (skill_id);

create table public.project_benchmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  capability text not null,
  own_status public.benchmark_own_status not null,
  own_evidence_id uuid references public.evidence (id),
  competitor text,
  competitor_status public.benchmark_competitor_status not null default 'unknown',
  competitor_source_url text,
  checked_at date,
  note text,
  visibility public.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table public.project_benchmarks is
  'Feature comparison against commercial products, each row sourced (ADR-0009). '
  'Eligible as a document source only when own_evidence_id is verified and checked_at is within 180 days (I12).';

create trigger set_updated_at
  before update on public.project_benchmarks
  for each row execute function public.set_updated_at();

alter table public.project_benchmarks enable row level security;

create index project_benchmarks_project_id_idx on public.project_benchmarks (project_id);
