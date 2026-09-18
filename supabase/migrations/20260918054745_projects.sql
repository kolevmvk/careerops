-- Projects and project decisions (docs/DOMAIN.md §3.3, §4.3).
-- project_benchmarks and evidence, which reference projects, follow in the
-- next migration once evidence exists (project_benchmarks.own_evidence_id).

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  name text not null,
  slug text not null,
  parent_project_id uuid references public.projects (id),
  employment_id uuid references public.employments (id),
  kind public.project_kind not null,
  role text,
  ownership public.project_ownership not null,
  problem text,
  constraints text,
  solution text,
  architecture_md text,
  result text,
  operational_status public.operational_status not null default 'concept',
  started_at date not null,
  ended_at date,
  date_precision public.date_precision not null default 'month',
  ip_owner public.ip_owner not null,
  code_visibility public.code_visibility not null,
  repo_url text,
  live_url text,
  store_urls jsonb not null default '{}'::jsonb,
  visibility public.visibility not null default 'private',
  disclosure_status public.disclosure_status not null default 'not_required',
  ai_allowed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint projects_user_slug_unique unique (user_id, slug),
  constraint projects_not_own_parent check (parent_project_id is null or parent_project_id <> id),
  constraint projects_dates_check check (ended_at is null or ended_at >= started_at)
);
comment on table public.projects is
  'Structured case: problem, role, ownership, architecture, result. parent_project_id models product families (§4.3).';

create trigger set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

create index projects_user_id_idx on public.projects (user_id);
create index projects_parent_project_id_idx on public.projects (parent_project_id);
create index projects_employment_id_idx on public.projects (employment_id);

create table public.project_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  context text,
  decision text,
  alternatives text,
  consequences text,
  decided_at date,
  visibility public.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table public.project_decisions is
  'ADR-style record feeding case studies, interview prep and design-level evidence.';

create trigger set_updated_at
  before update on public.project_decisions
  for each row execute function public.set_updated_at();

alter table public.project_decisions enable row level security;

create index project_decisions_project_id_idx on public.project_decisions (project_id);
