-- Opportunities: one pipeline for job-ad applications and direct outreach
-- (docs/DOMAIN.md §3.8, §4.8, ADR-0008).

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  track public.opportunity_track not null,
  origin public.opportunity_origin not null,
  organization_id uuid references public.organizations (id),
  job_id uuid references public.jobs (id),
  target_role_id uuid references public.target_roles (id),
  project_id uuid references public.projects (id),
  title text not null,
  angle text,
  fit smallint check (fit between 1 and 5),
  receptiveness smallint check (receptiveness between 1 and 5),
  stage public.opportunity_stage not null default 'identified',
  outcome public.opportunity_outcome not null default 'open',
  job_match_id uuid references public.job_matches (id),
  expected_comp numeric,
  offered_comp numeric,
  comp_currency text,
  comp_period public.comp_period,
  comp_basis public.comp_basis,
  contract_type public.contract_type,
  remote_policy public.remote_policy not null default 'unknown',
  terms_notes text,
  first_contact_at timestamptz,
  next_action text,
  next_action_due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table public.opportunities is
  'One pursuit: origin, pitch angle, the proof it leverages (project_id), and expected/offered terms (D9, D10).';

create trigger set_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();

alter table public.opportunities enable row level security;

create index opportunities_organization_id_idx on public.opportunities (organization_id);
create index opportunities_job_id_idx on public.opportunities (job_id);
create index opportunities_target_role_id_idx on public.opportunities (target_role_id);
create index opportunities_project_id_idx on public.opportunities (project_id);

create table public.opportunity_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  document_version_id uuid not null references public.document_versions (id),
  role public.opportunity_document_role not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table public.opportunity_documents is
  'Frozen document versions sent in an opportunity. Linking here freezes the version (I3).';

create trigger set_updated_at
  before update on public.opportunity_documents
  for each row execute function public.set_updated_at();

alter table public.opportunity_documents enable row level security;

create index opportunity_documents_opportunity_id_idx on public.opportunity_documents (opportunity_id);
create index opportunity_documents_document_version_id_idx on public.opportunity_documents (document_version_id);

create table public.opportunity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  type public.opportunity_event_type not null,
  interview_kind public.interview_kind,
  from_stage public.opportunity_stage,
  to_stage public.opportunity_stage,
  occurred_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table public.opportunity_events is
  'Stage changes, messages, calls, interviews, proposals, follow-ups. Stage and outcome are tracked separately.';

create trigger set_updated_at
  before update on public.opportunity_events
  for each row execute function public.set_updated_at();

alter table public.opportunity_events enable row level security;

create index opportunity_events_opportunity_id_idx on public.opportunity_events (opportunity_id, occurred_at);
