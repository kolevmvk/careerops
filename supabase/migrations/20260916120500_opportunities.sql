-- Opportunities: one pipeline for ads and outreach, with typed events.
-- DOMAIN.md §4.8, invariant I3.

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  track opportunity_track not null default 'contract',
  origin opportunity_origin not null,
  organization_id uuid references organizations on delete set null,
  job_id uuid references jobs on delete set null,
  target_role_id uuid references target_roles on delete set null,
  project_id uuid references projects on delete set null,
  title text not null,
  angle text,
  fit smallint,
  receptiveness smallint,
  stage opportunity_stage not null default 'identified',
  outcome opportunity_outcome not null default 'open',
  expected_comp numeric,
  offered_comp numeric,
  comp_currency text,
  comp_period comp_period not null default 'month',
  comp_basis comp_basis not null default 'b2b_invoice',
  contract_type contract_type,
  remote_policy remote_policy not null default 'unknown',
  terms_notes text,
  first_contact_at timestamptz,
  next_action text,
  next_action_due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint opportunities_fit_range check (fit is null or fit between 1 and 5),
  constraint opportunities_receptiveness_range
    check (receptiveness is null or receptiveness between 1 and 5)
);

create index opportunities_user_stage_idx on opportunities (user_id, stage, next_action_due);
create index opportunities_job_idx on opportunities (job_id) where job_id is not null;

create table opportunity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  opportunity_id uuid not null references opportunities on delete cascade,
  type opportunity_event_type not null,
  interview_kind interview_kind,
  from_stage opportunity_stage,
  to_stage opportunity_stage,
  occurred_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  constraint opportunity_events_interview_kind_scope
    check (interview_kind is null or type = 'interview'),
  constraint opportunity_events_stage_change_has_target
    check (type <> 'stage_change' or to_stage is not null)
);

create index opportunity_events_opportunity_idx
  on opportunity_events (opportunity_id, occurred_at desc);

create table opportunity_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  opportunity_id uuid not null references opportunities on delete cascade,
  document_version_id uuid not null references document_versions on delete restrict,
  role document_kind not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint opportunity_documents_unique unique (opportunity_id, document_version_id)
);

create trigger opportunities_set_updated_at
  before update on opportunities
  for each row execute function set_updated_at();

-- I3: attaching a version to an opportunity is the moment it becomes the record
-- of what was sent, so the freeze happens here rather than being remembered.
create function freeze_version_on_attach() returns trigger
language plpgsql
as $$
begin
  update document_versions
     set status = 'frozen',
         frozen_at = coalesce(frozen_at, now())
   where id = new.document_version_id
     and status <> 'frozen';

  return new;
end;
$$;

comment on function freeze_version_on_attach() is
  'DOMAIN I3. Linking a document version to an opportunity freezes it.';

create trigger opportunity_documents_freeze_version
  after insert on opportunity_documents
  for each row execute function freeze_version_on_attach();

-- A stage change on the opportunity leaves a trace without the app remembering to.
create function log_opportunity_stage_change() returns trigger
language plpgsql
as $$
begin
  if new.stage is distinct from old.stage then
    insert into opportunity_events (user_id, opportunity_id, type, from_stage, to_stage)
    values (new.user_id, new.id, 'stage_change', old.stage, new.stage);
  end if;

  return new;
end;
$$;

create trigger opportunities_log_stage_change
  after update of stage on opportunities
  for each row execute function log_opportunity_stage_change();

alter table opportunities enable row level security;
alter table opportunity_events enable row level security;
alter table opportunity_documents enable row level security;

create policy opportunities_owner on opportunities
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- I10-style: events are the funnel's audit trail, so they are append-only.
create policy opportunity_events_insert on opportunity_events
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy opportunity_events_select on opportunity_events
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy opportunity_documents_owner on opportunity_documents
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
