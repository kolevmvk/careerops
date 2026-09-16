-- Enums, shared helpers and the visibility machinery every later table depends on.
-- DOMAIN.md §4 (conventions), §5 (visibility and disclosure), §6 (invariants I1, I2, I3).
--
-- Everything CareerOps owns lives in its own schema (ADR-0016). The database
-- this runs against also hosts another project, and `profiles`, `jobs`,
-- `documents` and `organizations` are names almost any Supabase project already
-- uses. A separate schema removes the collision entirely and makes the whole
-- system revocable with one `drop schema careerops cascade`.
create schema if not exists careerops;

-- Unqualified objects below are created in careerops, not public. References to
-- auth and extensions stay explicitly qualified.
set search_path = careerops, public;

-- Ordered visibility. Postgres compares enum values by declaration order, so
-- `private < cv_safe < portfolio_public` holds for <, least() and greatest().
create type visibility as enum ('private', 'cv_safe', 'portfolio_public');

create type disclosure_status as enum (
  'not_required',
  'approval_required',
  'approved',
  'restricted'
);

create type date_precision as enum ('day', 'month', 'year');

create type remote_policy as enum ('remote', 'hybrid', 'onsite', 'unknown');

create type employment_type as enum (
  'full_time',
  'part_time',
  'contract',
  'freelance',
  'military',
  'internship'
);

create type project_kind as enum (
  'product',
  'client_work',
  'internal_tool',
  'lab',
  'infrastructure'
);

create type project_ownership as enum ('sole', 'lead', 'core_contributor', 'contributor');

create type operational_status as enum (
  'concept',
  'prototype',
  'production',
  'maintained',
  'retired'
);

create type ip_owner as enum ('self', 'employer', 'client', 'shared', 'unclear');

create type code_visibility as enum ('public', 'private', 'employer_owned');

create type role_tier as enum ('primary', 'bridge', 'stretch', 'fallback');

create type comp_period as enum ('month', 'year');

create type comp_basis as enum ('gross', 'net', 'b2b_invoice');

create type contract_type as enum ('employment', 'b2b_contract', 'freelance');

create type job_source_kind as enum (
  'paste',
  'url_fetch',
  'ats_api',
  'share_intent',
  'bookmarklet'
);

create type job_status as enum ('new', 'parsed', 'reviewed', 'archived');

create type document_kind as enum (
  'cv',
  'cover_letter',
  'linkedin_profile',
  'case_study',
  'pitch',
  'one_pager',
  'integration_brief',
  'article'
);

create type document_status as enum ('draft', 'frozen');

create type document_generator as enum ('manual', 'template', 'ai_assisted');

create type opportunity_track as enum ('employment', 'contract', 'consulting');

create type opportunity_origin as enum ('job_ad', 'outreach', 'referral', 'inbound');

create type opportunity_stage as enum (
  'identified',
  'researched',
  'contacted',
  'conversation',
  'evaluation',
  'negotiation',
  'closed'
);

create type opportunity_outcome as enum (
  'open',
  'won',
  'declined_by_me',
  'rejected',
  'withdrawn',
  'no_response',
  'parked'
);

create type opportunity_event_type as enum (
  'stage_change',
  'message_sent',
  'message_received',
  'call',
  'interview',
  'proposal',
  'offer',
  'follow_up',
  'note'
);

create type interview_kind as enum ('screening', 'technical', 'hiring_manager', 'final');

-- `updated_at` maintenance, attached by every table that carries the column.
create function set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- DOMAIN §5.2: a third party's position caps how far a fact may travel.
create function disclosure_ceiling(status disclosure_status) returns visibility
language sql
immutable
parallel safe
as $$
  select case status
    when 'not_required' then 'portfolio_public'::visibility
    when 'approved' then 'portfolio_public'::visibility
    when 'approval_required' then 'cv_safe'::visibility
    when 'restricted' then 'cv_safe'::visibility
  end;
$$;

comment on function disclosure_ceiling(disclosure_status) is
  'DOMAIN §5.2. Maximum visibility a row may reach given its disclosure status.';

-- I1, first half: a row never exceeds its own ceiling. The parent half is
-- enforced per table, because each knows its own parent column.
create function enforce_disclosure_ceiling() returns trigger
language plpgsql
as $$
begin
  if new.visibility > disclosure_ceiling(new.disclosure_status) then
    raise exception
      'visibility % exceeds the % ceiling of % (DOMAIN I1)',
      new.visibility, new.disclosure_status, disclosure_ceiling(new.disclosure_status)
      using errcode = 'check_violation';
  end if;

  if new.disclosure_status = 'restricted' and coalesce(new.ai_allowed, false) then
    raise exception 'restricted rows force ai_allowed = false (DOMAIN §5.2)'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
