-- User skill state, kept separate from the catalog (docs/DOMAIN.md §3.2, §4.2, ADR-0002).

create table public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  skill_id uuid not null references public.skills (id) on delete cascade,
  target_level smallint check (target_level between 0 and 5),
  status public.skill_status not null default 'active',
  feasibility public.skill_feasibility not null default 'medium',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint user_skills_user_skill_unique unique (user_id, skill_id)
);

create trigger set_updated_at
  before update on public.user_skills
  for each row execute function public.set_updated_at();

alter table public.user_skills enable row level security;

create index user_skills_skill_id_idx on public.user_skills (skill_id);

-- Append-only: no update/delete policy is ever added (I10). The latest row
-- per user_skill_id is the current assessed level.
create table public.skill_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  user_skill_id uuid not null references public.user_skills (id) on delete cascade,
  assessed_level smallint not null check (assessed_level between 0 and 5),
  method public.skill_assessment_method not null,
  rationale text not null,
  assessed_at timestamptz not null default now()
);
comment on table public.skill_assessments is 'Append-only (I10). The latest row per user_skill_id is the current assessed level.';

alter table public.skill_assessments enable row level security;

create index skill_assessments_user_skill_id_idx on public.skill_assessments (user_skill_id, assessed_at desc);
