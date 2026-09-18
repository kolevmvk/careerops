-- Execution: roadmap and tasks (docs/DOMAIN.md §3.7, §4.7).
--
-- I7 (a roadmap item requiring evidence cannot become done without a
-- verified linked evidence row) is an invariant trigger deferred to the
-- row-level-security-and-invariant-triggers issue.

create table public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  title text not null,
  description text,
  horizon public.roadmap_horizon not null,
  target_role_id uuid references public.target_roles (id),
  status public.roadmap_status not null default 'planned',
  due_date date,
  definition_of_done jsonb not null default '[]'::jsonb,
  requires_evidence boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table public.roadmap_items is
  'Milestone with horizon (d90, m6, target) and a definition of done that new evidence satisfies (I7).';

create trigger set_updated_at
  before update on public.roadmap_items
  for each row execute function public.set_updated_at();

alter table public.roadmap_items enable row level security;

create index roadmap_items_target_role_id_idx on public.roadmap_items (target_role_id);

create table public.roadmap_item_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  roadmap_item_id uuid not null references public.roadmap_items (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  from_level smallint check (from_level between 0 and 5),
  to_level smallint check (to_level between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint roadmap_item_skills_unique unique (roadmap_item_id, skill_id)
);

create trigger set_updated_at
  before update on public.roadmap_item_skills
  for each row execute function public.set_updated_at();

alter table public.roadmap_item_skills enable row level security;

create index roadmap_item_skills_skill_id_idx on public.roadmap_item_skills (skill_id);

create table public.roadmap_item_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  roadmap_item_id uuid not null references public.roadmap_items (id) on delete cascade,
  evidence_id uuid not null references public.evidence (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint roadmap_item_evidence_unique unique (roadmap_item_id, evidence_id)
);

create trigger set_updated_at
  before update on public.roadmap_item_evidence
  for each row execute function public.set_updated_at();

alter table public.roadmap_item_evidence enable row level security;

create index roadmap_item_evidence_evidence_id_idx on public.roadmap_item_evidence (evidence_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  title text not null,
  notes text,
  status public.task_status not null default 'todo',
  due_date date,
  is_focus boolean not null default false,
  skill_id uuid references public.skills (id),
  job_id uuid references public.jobs (id),
  -- DOMAIN.md §4.7 lists this as application_id; applications were replaced
  -- by opportunities (§3.10, D9), so it references opportunities here.
  opportunity_id uuid references public.opportunities (id),
  project_id uuid references public.projects (id),
  learning_resource_id uuid references public.learning_resources (id),
  roadmap_item_id uuid references public.roadmap_items (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table public.tasks is
  'Concrete action, optionally linked to what it moves forward. is_focus marks the 3-5 selected actions (I11, app-enforced).';

create trigger set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

create index tasks_skill_id_idx on public.tasks (skill_id);
create index tasks_job_id_idx on public.tasks (job_id);
create index tasks_opportunity_id_idx on public.tasks (opportunity_id);
create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_learning_resource_id_idx on public.tasks (learning_resource_id);
create index tasks_roadmap_item_id_idx on public.tasks (roadmap_item_id);
