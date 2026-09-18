-- Scoring snapshots (docs/DOMAIN.md §3.6, §4.6, ADR-0003).
--
-- I8: snapshots always carry scoring_version and scoring_config_id; exactly
-- one row per subject has is_current = true, enforced by a partial unique
-- index (nullable subject columns are coalesced so NULL still counts as one
-- subject value, since Postgres treats NULL <> NULL in a plain unique index).

create table careerops.scoring_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  version text not null,
  weights jsonb not null default '{}'::jsonb,
  thresholds jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint scoring_configs_user_version_unique unique (user_id, version)
);
comment on table careerops.scoring_configs is 'Versioned weights and thresholds. Exactly one active per user.';

create trigger set_updated_at
  before update on careerops.scoring_configs
  for each row execute function careerops.set_updated_at();

alter table careerops.scoring_configs enable row level security;

create unique index scoring_configs_one_active_idx on careerops.scoring_configs (user_id) where is_active;

create table careerops.skill_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  user_skill_id uuid not null references careerops.user_skills (id) on delete cascade,
  target_role_id uuid references careerops.target_roles (id),
  scoring_version text not null,
  scoring_config_id uuid not null references careerops.scoring_configs (id),
  computed_at timestamptz not null default now(),
  is_current boolean not null default true,
  breakdown jsonb not null default '{}'::jsonb,
  assessed_level smallint check (assessed_level between 0 and 5),
  supported_level smallint check (supported_level between 0 and 5),
  effective_level smallint check (effective_level between 0 and 5),
  evidence_confidence numeric,
  market_frequency numeric,
  target_level smallint check (target_level between 0 and 5),
  gap_type careerops.gap_type not null default 'none',
  gap_priority numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table careerops.skill_scores is 'Per user skill (optionally per target role), append-mostly (D8).';

create trigger set_updated_at
  before update on careerops.skill_scores
  for each row execute function careerops.set_updated_at();

alter table careerops.skill_scores enable row level security;

create index skill_scores_user_skill_id_idx on careerops.skill_scores (user_skill_id);
create index skill_scores_target_role_id_idx on careerops.skill_scores (target_role_id);
create unique index skill_scores_one_current_idx
  on careerops.skill_scores (user_id, user_skill_id, coalesce(target_role_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where is_current;

create table careerops.job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  job_id uuid not null references careerops.jobs (id) on delete cascade,
  scoring_version text not null,
  scoring_config_id uuid not null references careerops.scoring_configs (id),
  computed_at timestamptz not null default now(),
  is_current boolean not null default true,
  breakdown jsonb not null default '{}'::jsonb,
  score numeric not null,
  constraint_gate careerops.constraint_gate not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table careerops.job_matches is 'Per job: score, hard-constraint gate, per-requirement breakdown (D6, D8).';

create trigger set_updated_at
  before update on careerops.job_matches
  for each row execute function careerops.set_updated_at();

alter table careerops.job_matches enable row level security;

create index job_matches_job_id_idx on careerops.job_matches (job_id);
create unique index job_matches_one_current_idx on careerops.job_matches (user_id, job_id) where is_current;

create table careerops.readiness_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  target_role_id uuid not null references careerops.target_roles (id) on delete cascade,
  scoring_version text not null,
  scoring_config_id uuid not null references careerops.scoring_configs (id),
  computed_at timestamptz not null default now(),
  is_current boolean not null default true,
  breakdown jsonb not null default '{}'::jsonb,
  score numeric not null,
  sample_size int not null default 0,
  sufficient_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table careerops.readiness_snapshots is 'Per target role: readiness score and breakdown (D8).';

create trigger set_updated_at
  before update on careerops.readiness_snapshots
  for each row execute function careerops.set_updated_at();

alter table careerops.readiness_snapshots enable row level security;

create index readiness_snapshots_target_role_id_idx on careerops.readiness_snapshots (target_role_id);
create unique index readiness_snapshots_one_current_idx
  on careerops.readiness_snapshots (user_id, target_role_id)
  where is_current;
