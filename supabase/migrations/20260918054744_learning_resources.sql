-- Learning resources (docs/DOMAIN.md §3.4, §4.4).

create table careerops.learning_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  title text not null,
  provider text,
  type careerops.learning_resource_type not null,
  url text,
  status careerops.learning_resource_status not null default 'planned',
  progress_percent smallint not null default 0 check (progress_percent between 0 and 100),
  started_at date,
  completed_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create trigger set_updated_at
  before update on careerops.learning_resources
  for each row execute function careerops.set_updated_at();

alter table careerops.learning_resources enable row level security;

create table careerops.learning_resource_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  learning_resource_id uuid not null references careerops.learning_resources (id) on delete cascade,
  skill_id uuid not null references careerops.skills (id) on delete cascade,
  relevance smallint not null check (relevance between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint learning_resource_skills_unique unique (learning_resource_id, skill_id)
);

create trigger set_updated_at
  before update on careerops.learning_resource_skills
  for each row execute function careerops.set_updated_at();

alter table careerops.learning_resource_skills enable row level security;

create index learning_resource_skills_skill_id_idx on careerops.learning_resource_skills (skill_id);
