-- Documents generated from verified facts, frozen when sent.
-- DOMAIN.md §4.8, invariants I2 and I4. Guardrails are SPECIFICATION §8.

-- All objects are created in the careerops schema (ADR-0016), never public.
set search_path = careerops, public;

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind document_kind not null,
  title text not null,
  language text not null default 'en',
  target_role_id uuid references target_roles on delete set null,
  job_id uuid references jobs on delete set null,
  organization_id uuid references organizations on delete set null,
  project_id uuid references projects on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index documents_user_idx on documents (user_id, kind, created_at desc);

create table document_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  document_id uuid not null references documents on delete cascade,
  version int not null,
  content jsonb not null default '{}'::jsonb,
  rendered_md text,
  status document_status not null default 'draft',
  frozen_at timestamptz,
  generator document_generator not null default 'template',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint document_versions_number_unique unique (document_id, version),
  constraint document_versions_frozen_has_timestamp
    check ((status = 'frozen') = (frozen_at is not null))
);

create index document_versions_document_idx on document_versions (document_id, version desc);

-- Minimum effective visibility a fact needs to appear in this kind of document.
create function document_kind_visibility_minimum(kind document_kind) returns visibility
language sql
immutable
parallel safe
as $$
  select case kind
    when 'case_study' then 'portfolio_public'::visibility
    when 'article' then 'portfolio_public'::visibility
    else 'cv_safe'::visibility
  end;
$$;

comment on function document_kind_visibility_minimum(document_kind) is
  'DOMAIN I4. LinkedIn is cv_safe: professional disclosure, not technical depth.';

create table document_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  document_version_id uuid not null references document_versions on delete cascade,
  section text not null,
  employment_id uuid references employments on delete cascade,
  employment_highlight_id uuid references employment_highlights on delete cascade,
  project_id uuid references projects on delete cascade,
  created_at timestamptz not null default now(),
  -- Exactly one fact per source row, so every sentence traces to one place.
  constraint document_sources_exactly_one_fact check (
    num_nonnulls(employment_id, employment_highlight_id, project_id) = 1
  )
);

create index document_sources_version_idx on document_sources (document_version_id);

create trigger documents_set_updated_at
  before update on documents
  for each row execute function set_updated_at();

create trigger document_versions_set_updated_at
  before update on document_versions
  for each row execute function set_updated_at();

-- I2: a frozen version is what was sent. It cannot change or disappear.
create function block_frozen_version_write() returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'frozen' then
      raise exception 'a frozen document version cannot be deleted (DOMAIN I2)'
        using errcode = 'check_violation';
    end if;
    return old;
  end if;

  if old.status = 'frozen' then
    raise exception 'a frozen document version cannot be updated (DOMAIN I2)'
      using errcode = 'check_violation';
  end if;

  if new.status = 'frozen' and new.frozen_at is null then
    new.frozen_at := now();
  end if;

  return new;
end;
$$;

create trigger document_versions_block_frozen_update
  before update on document_versions
  for each row execute function block_frozen_version_write();

create trigger document_versions_block_frozen_delete
  before delete on document_versions
  for each row execute function block_frozen_version_write();

-- I4: a fact may only be cited by a document its effective visibility allows.
create function enforce_document_source_visibility() returns trigger
language plpgsql
as $$
declare
  minimum visibility;
  effective visibility;
  version_status document_status;
begin
  select dv.status, document_kind_visibility_minimum(d.kind)
    into version_status, minimum
    from document_versions dv
    join documents d on d.id = dv.document_id
   where dv.id = new.document_version_id;

  if version_status = 'frozen' then
    raise exception 'sources cannot be added to a frozen version (DOMAIN I2)'
      using errcode = 'check_violation';
  end if;

  if new.employment_id is not null then
    select least(e.visibility, disclosure_ceiling(e.disclosure_status))
      into effective
      from employments e
     where e.id = new.employment_id;

  elsif new.employment_highlight_id is not null then
    select least(
             h.visibility,
             e.visibility,
             disclosure_ceiling(e.disclosure_status)
           )
      into effective
      from employment_highlights h
      join employments e on e.id = h.employment_id
     where h.id = new.employment_highlight_id;

    -- I5: an unverified claim is not a fact yet.
    if not exists (
      select 1 from employment_highlights h
       where h.id = new.employment_highlight_id and h.verified_at is not null
    ) then
      raise exception 'unverified highlights cannot be document sources (DOMAIN I5)'
        using errcode = 'check_violation';
    end if;

  else
    select least(p.visibility, disclosure_ceiling(p.disclosure_status))
      into effective
      from projects p
     where p.id = new.project_id;
  end if;

  if effective < minimum then
    raise exception
      'source effective visibility % is below the % minimum for this document kind (DOMAIN I4)',
      effective, minimum
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger document_sources_enforce_visibility
  before insert or update on document_sources
  for each row execute function enforce_document_source_visibility();

alter table documents enable row level security;
alter table document_versions enable row level security;
alter table document_sources enable row level security;

create policy documents_owner on documents
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy document_versions_owner on document_versions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy document_sources_owner on document_sources
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
