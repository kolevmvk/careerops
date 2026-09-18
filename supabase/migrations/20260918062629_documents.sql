-- Documents: one model for CV, cover letter, LinkedIn profile, case study,
-- pitch, one-pager, integration brief and article (docs/DOMAIN.md §3.8,
-- §4.8, ADR-0005).
--
-- Freeze-on-send (I2, I3) and the per-kind minimum-visibility check on
-- sources (I4) are invariant triggers deferred to the row-level-security-
-- and-invariant-triggers issue, alongside RLS policies (see
-- supabase/migrations/README.md).

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  kind public.document_kind not null,
  title text not null,
  language text not null default 'en',
  target_role_id uuid references public.target_roles (id),
  job_id uuid references public.jobs (id),
  organization_id uuid references public.organizations (id),
  project_id uuid references public.projects (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table public.documents is 'Logical document. Versions carry the actual content (D5).';

create trigger set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

alter table public.documents enable row level security;

create index documents_target_role_id_idx on public.documents (target_role_id);
create index documents_job_id_idx on public.documents (job_id);
create index documents_organization_id_idx on public.documents (organization_id);
create index documents_project_id_idx on public.documents (project_id);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  version int not null,
  content jsonb not null default '{}'::jsonb,
  rendered_md text,
  status public.document_version_status not null default 'draft',
  frozen_at timestamptz,
  generator public.document_generator not null default 'manual',
  ai_analysis_id uuid references public.ai_analyses (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint document_versions_document_version_unique unique (document_id, version)
);
comment on table public.document_versions is
  'Structured content plus rendered Markdown. Frozen when linked to an opportunity (I3); a frozen version is then immutable (I2).';

create trigger set_updated_at
  before update on public.document_versions
  for each row execute function public.set_updated_at();

alter table public.document_versions enable row level security;

create index document_versions_ai_analysis_id_idx on public.document_versions (ai_analysis_id);

create table public.document_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  document_version_id uuid not null references public.document_versions (id) on delete cascade,
  section text not null,
  employment_id uuid references public.employments (id),
  employment_highlight_id uuid references public.employment_highlights (id),
  project_id uuid references public.projects (id),
  project_decision_id uuid references public.project_decisions (id),
  project_benchmark_id uuid references public.project_benchmarks (id),
  evidence_id uuid references public.evidence (id),
  credential_id uuid references public.credentials (id),
  education_id uuid references public.education (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint document_sources_exactly_one_source check (
    num_nonnulls(
      employment_id,
      employment_highlight_id,
      project_id,
      project_decision_id,
      project_benchmark_id,
      evidence_id,
      credential_id,
      education_id
    ) = 1
  )
);
comment on table public.document_sources is
  'Which verified fact a document version''s section is built from; exactly one source column is set.';

create trigger set_updated_at
  before update on public.document_sources
  for each row execute function public.set_updated_at();

alter table public.document_sources enable row level security;

create index document_sources_document_version_id_idx on public.document_sources (document_version_id);
