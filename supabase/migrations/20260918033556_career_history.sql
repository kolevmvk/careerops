-- Career history tables (docs/DOMAIN.md §3.1, §4.1).
--
-- RLS and the visibility-ceiling / invariant triggers ship together across all
-- tables in a later migration (see issue: row-level security and invariant
-- triggers), so the uniform ADR-0007 policy is applied once, consistently.
-- Row Level Security is still enabled here with no policies attached, so
-- these tables default to deny-all over the API until that migration lands.

create table careerops.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) default auth.uid(),
  full_name text,
  headline text,
  summary text,
  location text,
  timezone text,
  remote_preference careerops.remote_preference not null default 'any',
  open_to_relocation boolean not null default false,
  work_authorization text[] not null default '{}',
  public_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table careerops.profiles is 'Identity and preferences. One row per user.';

create trigger set_updated_at
  before update on careerops.profiles
  for each row execute function careerops.set_updated_at();

alter table careerops.profiles enable row level security;

create table careerops.employments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  organization text not null,
  public_organization text,
  title text not null,
  public_title text,
  employment_type careerops.employment_type not null,
  start_date date not null,
  end_date date,
  date_precision careerops.date_precision not null default 'day',
  location text,
  summary text,
  visibility careerops.visibility not null default 'private',
  disclosure_status careerops.disclosure_status not null default 'not_required',
  ai_allowed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint employments_dates_check check (end_date is null or end_date >= start_date)
);
comment on table careerops.employments is 'Organization, title, dates. Carries visibility and disclosure (DOMAIN §5).';

create trigger set_updated_at
  before update on careerops.employments
  for each row execute function careerops.set_updated_at();

alter table careerops.employments enable row level security;

create index employments_user_id_idx on careerops.employments (user_id);

create table careerops.employment_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  employment_id uuid not null references careerops.employments (id) on delete cascade,
  text text not null,
  -- References evidence(id), added once the evidence table exists (issue:
  -- skill catalog, user skills, projects and evidence).
  evidence_id uuid,
  visibility careerops.visibility not null default 'private',
  verified_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table careerops.employment_highlights is
  'Individual CV-grade claims for an employment; the unit CV bullets are built from.';

create trigger set_updated_at
  before update on careerops.employment_highlights
  for each row execute function careerops.set_updated_at();

alter table careerops.employment_highlights enable row level security;

create index employment_highlights_employment_id_idx on careerops.employment_highlights (employment_id);
create index employment_highlights_user_id_idx on careerops.employment_highlights (user_id);

create table careerops.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  institution text not null,
  program text,
  degree text,
  start_date date,
  end_date date,
  date_precision careerops.date_precision not null default 'year',
  visibility careerops.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint education_dates_check check (end_date is null or start_date is null or end_date >= start_date)
);

create trigger set_updated_at
  before update on careerops.education
  for each row execute function careerops.set_updated_at();

alter table careerops.education enable row level security;

create index education_user_id_idx on careerops.education (user_id);

create table careerops.credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  name text not null,
  issuer text,
  status careerops.credential_status not null default 'planned',
  issued_at date,
  expires_at date,
  credential_url text,
  credential_id text,
  visibility careerops.visibility not null default 'private',
  -- References learning_resources(id), added once that table exists (issue:
  -- skill catalog, user skills, projects and evidence).
  learning_resource_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table careerops.credentials is
  'Certifications: planned -> in_progress -> earned -> expired, with verification URL.';

create trigger set_updated_at
  before update on careerops.credentials
  for each row execute function careerops.set_updated_at();

alter table careerops.credentials enable row level security;

create index credentials_user_id_idx on careerops.credentials (user_id);

create table careerops.languages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  language text not null,
  proficiency careerops.language_proficiency not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint languages_user_language_unique unique (user_id, language)
);
comment on table careerops.languages is 'Spoken languages with CEFR level (ISO 639-1 code). Used for hard-constraint checks.';

create trigger set_updated_at
  before update on careerops.languages
  for each row execute function careerops.set_updated_at();

alter table careerops.languages enable row level security;
