-- Enums for market, scoring snapshots, documents, opportunities, execution
-- and system tables (docs/DOMAIN.md §4.5-4.9).

-- Market (§4.5)
create type public.role_family as enum (
  'systems',
  'linux',
  'network',
  'infrastructure',
  'cloud',
  'devops',
  'security',
  'support',
  'other'
);
create type public.role_tier as enum ('primary', 'bridge', 'stretch', 'fallback');
create type public.role_status as enum ('active', 'paused');
create type public.comp_period as enum ('month', 'year');
create type public.comp_basis as enum ('gross', 'net', 'b2b_invoice');
create type public.employer_tier as enum (
  'a_builds_same_domain',
  'b_same_engineering_problems',
  'c_operates_the_problem'
);
create type public.remote_policy as enum ('remote', 'hybrid', 'onsite', 'unknown');
create type public.job_source_kind as enum ('paste', 'url_fetch', 'ats_api', 'share_intent', 'bookmarklet');
create type public.job_status as enum ('new', 'parsed', 'reviewed', 'archived');
create type public.requirement_kind as enum (
  'skill',
  'certification',
  'language',
  'location',
  'work_authorization',
  'clearance',
  'experience_years',
  'education'
);
create type public.requirement_importance as enum ('required', 'preferred');
create type public.requirement_mapping_status as enum ('auto', 'confirmed', 'unmapped', 'ignored');
create type public.requirement_extracted_by as enum ('dictionary', 'ai', 'manual');

-- Scoring snapshots (§4.6)
create type public.gap_type as enum ('none', 'prove', 'learn');
create type public.constraint_gate as enum ('pass', 'warn', 'fail', 'unknown');

-- System (§4.9)
create type public.ai_analysis_kind as enum (
  'job_extraction',
  'alias_suggestion',
  'evidence_mapping',
  'highlight_drafting',
  'match_explanation',
  'roadmap_suggestion'
);
create type public.ai_analysis_status as enum ('pending', 'running', 'succeeded', 'failed');
create type public.ai_analysis_decision as enum ('accepted', 'partially_accepted', 'rejected');
create type public.audit_actor as enum ('user', 'system', 'ai_worker');

-- Documents (§4.8)
create type public.document_kind as enum (
  'cv',
  'cover_letter',
  'linkedin_profile',
  'case_study',
  'pitch',
  'one_pager',
  'integration_brief',
  'article'
);
create type public.document_version_status as enum ('draft', 'frozen');
create type public.document_generator as enum ('manual', 'template', 'ai_assisted');

-- Opportunities (§4.8)
create type public.opportunity_track as enum ('employment', 'contract', 'consulting');
create type public.opportunity_origin as enum ('job_ad', 'outreach', 'referral', 'inbound');
create type public.opportunity_stage as enum (
  'identified',
  'researched',
  'contacted',
  'conversation',
  'evaluation',
  'negotiation',
  'closed'
);
create type public.opportunity_outcome as enum (
  'open',
  'won',
  'declined_by_me',
  'rejected',
  'withdrawn',
  'no_response',
  'parked'
);
create type public.contract_type as enum ('employment', 'b2b_contract', 'freelance');
create type public.opportunity_document_role as enum (
  'cv',
  'cover_letter',
  'pitch',
  'one_pager',
  'integration_brief',
  'case_study'
);
create type public.opportunity_event_type as enum (
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
create type public.interview_kind as enum ('screening', 'technical', 'hiring_manager', 'final');
create type public.contact_channel as enum ('linkedin', 'email', 'phone', 'event', 'referral');

-- Execution (§4.7)
create type public.roadmap_horizon as enum ('d90', 'm6', 'target');
create type public.roadmap_status as enum ('planned', 'active', 'done', 'dropped');
create type public.task_status as enum ('todo', 'doing', 'done', 'dropped');
