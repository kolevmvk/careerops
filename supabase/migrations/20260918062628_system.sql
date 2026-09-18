-- System tables: AI work queue, per-user settings, append-only audit log
-- (docs/DOMAIN.md §3.9, §4.9).

create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  kind public.ai_analysis_kind not null,
  provider text,
  model text,
  prompt_version text,
  input_refs jsonb not null default '{}'::jsonb,
  output jsonb,
  status public.ai_analysis_status not null default 'pending',
  decision public.ai_analysis_decision,
  error text,
  latency_ms int,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
comment on table public.ai_analyses is
  'Queue and audit record for every AI call (I6). input_refs holds ids only, never raw sensitive text.';

create trigger set_updated_at
  before update on public.ai_analyses
  for each row execute function public.set_updated_at();

alter table public.ai_analyses enable row level security;

create index ai_analyses_status_idx on public.ai_analyses (status);

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  key text not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint settings_user_key_unique unique (user_id, key)
);

create trigger set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

alter table public.settings enable row level security;

-- Append-only (I10): no update/delete policy is ever added.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  entity text not null,
  entity_id uuid not null,
  action text not null,
  changed_fields text[] not null default '{}',
  actor public.audit_actor not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
comment on table public.audit_log is 'Append-only record of visibility changes, freezes and AI-assisted edits (I10).';

alter table public.audit_log enable row level security;

create index audit_log_entity_idx on public.audit_log (entity, entity_id);
