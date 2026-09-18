-- Enums for the skill catalog, projects and evidence (docs/DOMAIN.md §4.2-4.4).

create type careerops.skill_kind as enum ('technology', 'platform', 'language', 'practice', 'domain');

create type careerops.skill_status as enum ('active', 'maintenance', 'deferred', 'archived');

create type careerops.skill_feasibility as enum ('low', 'medium', 'high');

create type careerops.skill_assessment_method as enum (
  'self',
  'evidence_review',
  'interview_feedback',
  'certification_exam',
  'external_review'
);

create type careerops.learning_resource_type as enum ('course', 'book', 'lab', 'certification_path', 'path');

create type careerops.learning_resource_status as enum ('planned', 'active', 'paused', 'completed', 'dropped');

create type careerops.project_kind as enum ('product', 'client_work', 'internal_tool', 'lab', 'infrastructure');

create type careerops.project_ownership as enum ('sole', 'lead', 'core_contributor', 'contributor');

create type careerops.operational_status as enum ('concept', 'prototype', 'production', 'maintained', 'retired');

create type careerops.ip_owner as enum ('self', 'employer', 'client', 'shared', 'unclear');

create type careerops.code_visibility as enum ('public', 'private', 'employer_owned');

create type careerops.benchmark_own_status as enum ('implemented', 'partial', 'planned', 'absent');

create type careerops.benchmark_competitor_status as enum ('yes', 'partial', 'no', 'unknown');

create type careerops.evidence_type as enum (
  'production_deployment',
  'release',
  'work_experience',
  'repository',
  'pull_request',
  'incident_record',
  'design_document',
  'lab',
  'certification',
  'documentation',
  'demo_url',
  'article',
  'course_completion'
);

create type careerops.evidence_source as enum ('manual', 'import', 'ai_suggested');

create type careerops.evidence_suggested_by as enum ('user', 'ai', 'rule');
