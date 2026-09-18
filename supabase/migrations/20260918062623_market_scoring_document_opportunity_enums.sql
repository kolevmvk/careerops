-- Enums for market, scoring snapshots, documents, opportunities, execution
-- and system tables (docs/DOMAIN.md §4.5-4.9).

-- Market (§4.5)
create type careerops.role_family as enum (
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
create type careerops.role_tier as enum ('primary', 'bridge', 'stretch', 'fallback');
create type careerops.role_status as enum ('active', 'paused');
create type careerops.comp_period as enum ('month', 'year');
create type careerops.comp_basis as enum ('gross', 'net', 'b2b_invoice');
create type careerops.employer_tier as enum (
  'a_builds_same_domain',
  'b_same_engineering_problems',
  'c_operates_the_problem'
);
create type careerops.remote_policy as enum ('remote', 'hybrid', 'onsite', 'unknown');
create type careerops.job_source_kind as enum ('paste', 'url_fetch', 'ats_api', 'share_intent', 'bookmarklet');
create type careerops.job_status as enum ('new', 'parsed', 'reviewed', 'archived');
create type careerops.requirement_kind as enum (
  'skill',
  'certification',
  'language',
  'location',
  'work_authorization',
  'clearance',
  'experience_years',
  'education'
);
create type careerops.requirement_importance as enum ('required', 'preferred');
create type careerops.requirement_mapping_status as enum ('auto', 'confirmed', 'unmapped', 'ignored');
create type careerops.requirement_extracted_by as enum ('dictionary', 'ai', 'manual');

-- Scoring snapshots (§4.6)
create type careerops.gap_type as enum ('none', 'prove', 'learn');
create type careerops.constraint_gate as enum ('pass', 'warn', 'fail', 'unknown');

-- System (§4.9)
create type careerops.ai_analysis_kind as enum (
  'job_extraction',
  'alias_suggestion',
  'evidence_mapping',
  'highlight_drafting',
  'match_explanation',
  'roadmap_suggestion'
);
create type careerops.ai_analysis_status as enum ('pending', 'running', 'succeeded', 'failed');
create type careerops.ai_analysis_decision as enum ('accepted', 'partially_accepted', 'rejected');
create type careerops.audit_actor as enum ('user', 'system', 'ai_worker');

-- Documents (§4.8)
create type careerops.document_kind as enum (
  'cv',
  'cover_letter',
  'linkedin_profile',
  'case_study',
  'pitch',
  'one_pager',
  'integration_brief',
  'article'
);
create type careerops.document_version_status as enum ('draft', 'frozen');
create type careerops.document_generator as enum ('manual', 'template', 'ai_assisted');

-- Opportunities (§4.8)
create type careerops.opportunity_track as enum ('employment', 'contract', 'consulting');
create type careerops.opportunity_origin as enum ('job_ad', 'outreach', 'referral', 'inbound');
create type careerops.opportunity_stage as enum (
  'identified',
  'researched',
  'contacted',
  'conversation',
  'evaluation',
  'negotiation',
  'closed'
);
create type careerops.opportunity_outcome as enum (
  'open',
  'won',
  'declined_by_me',
  'rejected',
  'withdrawn',
  'no_response',
  'parked'
);
create type careerops.contract_type as enum ('employment', 'b2b_contract', 'freelance');
create type careerops.opportunity_document_role as enum (
  'cv',
  'cover_letter',
  'pitch',
  'one_pager',
  'integration_brief',
  'case_study'
);
create type careerops.opportunity_event_type as enum (
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
create type careerops.interview_kind as enum ('screening', 'technical', 'hiring_manager', 'final');
create type careerops.contact_channel as enum ('linkedin', 'email', 'phone', 'event', 'referral');

-- Execution (§4.7)
create type careerops.roadmap_horizon as enum ('d90', 'm6', 'target');
create type careerops.roadmap_status as enum ('planned', 'active', 'done', 'dropped');
create type careerops.task_status as enum ('todo', 'doing', 'done', 'dropped');
