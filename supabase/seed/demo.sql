-- Fictional demo persona for local development, staging and the public
-- demo (docs/ENVIRONMENTS.md, docs/SPECIFICATION.md §13, ADR-0012). No real
-- people, employers or products: "Elena Voss", "GridWorks Energy GmbH",
-- "GreenGrid", "NorthGrid Systems" and every other name below is invented.
--
-- Rows are looked up by a distinguishing literal value (slug, title, name)
-- rather than captured into psql variables, matching the convention in
-- supabase/tests/ -- this file has to run the same way through `supabase
-- db reset` as the pgTAP tests run through `supabase test db`.
--
-- The demo user id (99999999-...) is reserved: `db reset` loads this file
-- before `test db` runs, in the same database, so it must not collide with
-- the throwaway user ids (11111111-..., 22222222-...) the pgTAP tests
-- insert and roll back.
begin;

-- ============================================================================
-- Demo auth user
-- ============================================================================
-- Fixed id so every other insert below can reference it as a literal.
-- Password is for local/staging convenience only; the public demo project
-- never contains real data (ADR-0007).
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '99999999-9999-9999-9999-999999999999',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'demo@careerops.dev',
  crypt('careerops-demo', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Elena Voss"}',
  now(), now()
);

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) values (
  '99999999-9999-9999-9999-999999999999',
  '99999999-9999-9999-9999-999999999999',
  '{"sub":"99999999-9999-9999-9999-999999999999","email":"demo@careerops.dev"}',
  'email',
  '99999999-9999-9999-9999-999999999999',
  now(), now(), now()
);

-- ============================================================================
-- 4.1 Career history
-- ============================================================================

insert into careerops.profiles (
  user_id, full_name, headline, summary, location, timezone,
  remote_preference, open_to_relocation, work_authorization, public_slug
) values (
  '99999999-9999-9999-9999-999999999999',
  'Elena Voss',
  'Platform & Cloud Infrastructure Engineer',
  'Infrastructure engineer focused on edge-to-cloud platforms: Kubernetes, Terraform, and the boring reliability work that keeps distributed fleets online.',
  'Berlin, Germany',
  'Europe/Berlin',
  'remote', true, array['EU', 'UK-visa-required'],
  'elena-voss-demo'
);

insert into careerops.employments (
  user_id, organization, title, employment_type, start_date, end_date,
  location, summary, visibility, disclosure_status, ai_allowed
) values
  (
    '99999999-9999-9999-9999-999999999999', 'GridWorks Energy GmbH', 'Senior Platform Engineer',
    'full_time', '2021-03-01', null, 'Berlin, Germany (remote)',
    'Own the platform team''s Kubernetes and edge-fleet infrastructure for a residential energy monitoring product.',
    'portfolio_public', 'approved', true
  ),
  (
    '99999999-9999-9999-9999-999999999999', 'Open Source Foundry', 'DevOps Engineer',
    'full_time', '2018-06-01', '2021-02-28', 'Remote',
    'Built CI/CD and release tooling for a small consultancy''s open-source client projects.',
    'portfolio_public', 'not_required', true
  ),
  (
    '99999999-9999-9999-9999-999999999999', 'Confidential Public-Sector Engagement', 'Infrastructure Consultant',
    'contract', '2020-01-01', '2020-06-30', null,
    'Short infrastructure consulting engagement under NDA.',
    'cv_safe', 'restricted', true
  ),
  (
    '99999999-9999-9999-9999-999999999999', 'Campus IT Services', 'IT Support Intern',
    'internship', '2017-06-01', '2017-09-01', 'Leipzig, Germany',
    'First-line support and workstation imaging for a university IT department.',
    'cv_safe', 'not_required', true
  );

insert into careerops.employment_highlights (user_id, employment_id, text, visibility, verified_at, sort_order)
select '99999999-9999-9999-9999-999999999999', id, h.text, h.visibility::careerops.visibility, h.verified_at, h.sort_order
from careerops.employments,
  lateral (values
    ('Migrated the platform team''s edge fleet from a single-region to a multi-region Kubernetes rollout, cutting update lead time from days to hours.', 'portfolio_public', now() - interval '60 days', 1),
    ('Introduced Terraform-managed infrastructure across all environments, replacing manual cloud console changes.', 'portfolio_public', now() - interval '90 days', 2)
  ) as h(text, visibility, verified_at, sort_order)
where organization = 'GridWorks Energy GmbH';

insert into careerops.employment_highlights (user_id, employment_id, text, visibility, verified_at, sort_order)
select '99999999-9999-9999-9999-999999999999', id, h.text, h.visibility::careerops.visibility, h.verified_at, h.sort_order
from careerops.employments,
  lateral (values
    ('Set up CI/CD pipelines for 6 client projects, reducing average deploy time from 45 minutes to under 5.', 'portfolio_public', now() - interval '400 days', 1)
  ) as h(text, visibility, verified_at, sort_order)
where organization = 'Open Source Foundry';

insert into careerops.employment_highlights (user_id, employment_id, text, visibility, sort_order)
select '99999999-9999-9999-9999-999999999999', id, 'Provided infrastructure consulting under NDA; details withheld per client agreement.', 'cv_safe', 1
from careerops.employments where organization = 'Confidential Public-Sector Engagement';

insert into careerops.education (user_id, institution, program, degree, start_date, end_date, date_precision, visibility)
values
  ('99999999-9999-9999-9999-999999999999', 'Technical University of Berlin', 'Computer Science', 'BSc', '2014-10-01', '2018-07-01', 'month', 'cv_safe'),
  ('99999999-9999-9999-9999-999999999999', 'Open University', 'Cloud Native Systems (non-degree)', null, '2022-01-01', '2022-06-01', 'month', 'cv_safe');

insert into careerops.credentials (user_id, name, issuer, status, issued_at, expires_at, credential_url, visibility)
values
  ('99999999-9999-9999-9999-999999999999', 'AWS Certified Solutions Architect - Associate', 'Amazon Web Services', 'earned', '2022-05-15', '2025-05-15', 'https://www.credly.com/badges/demo-aws-csaa', 'cv_safe'),
  ('99999999-9999-9999-9999-999999999999', 'Certified Kubernetes Administrator', 'CNCF', 'in_progress', null, null, null, 'cv_safe');

insert into careerops.languages (user_id, language, proficiency) values
  ('99999999-9999-9999-9999-999999999999', 'en', 'native'),
  ('99999999-9999-9999-9999-999999999999', 'de', 'b2');

-- ============================================================================
-- 4.2 Skill catalog and user skill state
-- ============================================================================

insert into careerops.skill_categories (user_id, name) values
  ('99999999-9999-9999-9999-999999999999', 'Cloud'),
  ('99999999-9999-9999-9999-999999999999', 'DevOps'),
  ('99999999-9999-9999-9999-999999999999', 'Linux'),
  ('99999999-9999-9999-9999-999999999999', 'Networking'),
  ('99999999-9999-9999-9999-999999999999', 'Security'),
  ('99999999-9999-9999-9999-999999999999', 'Programming'),
  ('99999999-9999-9999-9999-999999999999', 'Databases'),
  ('99999999-9999-9999-9999-999999999999', 'Automation');

insert into careerops.skills (user_id, name, slug, kind, category_id)
select '99999999-9999-9999-9999-999999999999', s.name, s.slug, s.kind::careerops.skill_kind, c.id
from careerops.skill_categories c
join lateral (values
  ('Cloud', 'AWS', 'aws', 'platform'),
  ('Cloud', 'Terraform', 'terraform', 'technology'),
  ('DevOps', 'Kubernetes', 'kubernetes', 'platform'),
  ('DevOps', 'Docker', 'docker', 'technology'),
  ('DevOps', 'CI/CD', 'ci-cd', 'practice'),
  ('DevOps', 'Release Engineering', 'release-engineering', 'practice'),
  ('DevOps', 'Incident Response', 'incident-response', 'practice'),
  ('DevOps', 'Observability', 'observability', 'practice'),
  ('Linux', 'Linux Administration', 'linux-administration', 'technology'),
  ('Networking', 'Networking Fundamentals', 'networking-fundamentals', 'domain'),
  ('Security', 'Identity & Access Management', 'identity-access-management', 'practice'),
  ('Security', 'Threat Modeling', 'threat-modeling', 'practice'),
  ('Programming', 'Python', 'python', 'language'),
  ('Programming', 'Go', 'go', 'language'),
  ('Databases', 'PostgreSQL', 'postgresql', 'technology'),
  ('Automation', 'Ansible', 'ansible', 'technology'),
  ('Automation', 'Bash Scripting', 'bash-scripting', 'technology')
) as s(category, name, slug, kind) on s.category = c.name
where c.user_id = '99999999-9999-9999-9999-999999999999';

insert into careerops.skills (user_id, name, slug, kind, category_id, parent_id)
select '99999999-9999-9999-9999-999999999999', 'IAM', 'iam', 'platform', category_id, id
from (select category_id, id from careerops.skills where slug = 'aws') as aws;

insert into careerops.skill_aliases (user_id, skill_id, alias, normalized)
select '99999999-9999-9999-9999-999999999999', sk.id, a.alias, a.normalized
from careerops.skills sk
join lateral (values
  ('aws', 'Amazon Web Services', 'amazon web services'),
  ('ci-cd', 'Continuous Integration', 'continuous integration'),
  ('kubernetes', 'K8s', 'k8s')
) as a(skill_slug, alias, normalized) on a.skill_slug = sk.slug
where sk.user_id = '99999999-9999-9999-9999-999999999999';

insert into careerops.user_skills (user_id, skill_id, target_level, status, feasibility)
select '99999999-9999-9999-9999-999999999999', id, u.target_level, u.status::careerops.skill_status, u.feasibility::careerops.skill_feasibility
from careerops.skills,
  lateral (values
    ('aws', 5, 'active', 'high'),
    ('iam', 4, 'active', 'high'),
    ('terraform', 4, 'active', 'high'),
    ('kubernetes', 5, 'active', 'high'),
    ('docker', 4, 'maintenance', 'high'),
    ('ci-cd', 4, 'active', 'high'),
    ('release-engineering', 4, 'active', 'high'),
    ('incident-response', 4, 'active', 'medium'),
    ('observability', 4, 'active', 'medium'),
    ('linux-administration', 4, 'maintenance', 'high'),
    ('networking-fundamentals', 3, 'maintenance', 'medium'),
    ('identity-access-management', 4, 'active', 'medium'),
    ('threat-modeling', 3, 'deferred', 'medium'),
    ('python', 3, 'maintenance', 'high'),
    ('go', 3, 'active', 'medium'),
    ('postgresql', 4, 'active', 'high'),
    ('ansible', 3, 'maintenance', 'medium'),
    ('bash-scripting', 4, 'maintenance', 'high')
  ) as u(slug, target_level, status, feasibility)
where skills.slug = u.slug;

insert into careerops.skill_assessments (user_id, user_skill_id, assessed_level, method, rationale)
select '99999999-9999-9999-9999-999999999999', us.id, a.assessed_level, a.method::careerops.skill_assessment_method, a.rationale
from careerops.user_skills us
join careerops.skills sk on sk.id = us.skill_id
join lateral (values
  ('aws', 4, 'evidence_review', 'Multi-account production infrastructure managed for 3+ years.'),
  ('iam', 3, 'evidence_review', 'Designed cross-account IAM roles for the platform team.'),
  ('terraform', 4, 'evidence_review', 'All GridWorks environments are Terraform-managed.'),
  ('kubernetes', 4, 'evidence_review', 'Operates a multi-region production cluster.'),
  ('docker', 4, 'self', 'Daily use since 2018.'),
  ('ci-cd', 4, 'evidence_review', 'Built pipelines for 6+ client projects.'),
  ('release-engineering', 4, 'evidence_review', 'Owns the GreenGrid release process end to end.'),
  ('incident-response', 3, 'evidence_review', 'Led postmortems for two major outages.'),
  ('observability', 3, 'self', 'Comfortable with metrics/logs/traces, still building alerting maturity.'),
  ('linux-administration', 4, 'self', 'Daily driver since university.'),
  ('networking-fundamentals', 3, 'self', 'Solid fundamentals, not a specialist.'),
  ('identity-access-management', 3, 'evidence_review', 'Built the IAM model for an open-source Postgres RLS tool.'),
  ('threat-modeling', 2, 'self', 'Some exposure, not yet applied end to end.'),
  ('python', 3, 'self', 'Used for internal tooling and scripts.'),
  ('go', 3, 'evidence_review', 'Wrote the pgshield CLI in Go.'),
  ('postgresql', 4, 'evidence_review', 'Operates a multi-region Postgres fleet.'),
  ('ansible', 3, 'self', 'Used for legacy config management before the Terraform migration.'),
  ('bash-scripting', 4, 'self', 'Heavy day-to-day use for operational tooling.')
) as a(slug, assessed_level, method, rationale) on a.slug = sk.slug
where us.user_id = '99999999-9999-9999-9999-999999999999';

-- ============================================================================
-- 4.4 Learning
-- ============================================================================

insert into careerops.learning_resources (user_id, title, provider, type, status, progress_percent, started_at, completed_at)
values
  ('99999999-9999-9999-9999-999999999999', 'Kubernetes the Hard Way', 'Kelsey Hightower (self-hosted)', 'course', 'completed', 100, '2021-04-01', '2021-05-01'),
  ('99999999-9999-9999-9999-999999999999', 'HashiCorp Terraform Associate Path', 'HashiCorp Learn', 'certification_path', 'active', 60, '2026-06-01', null),
  ('99999999-9999-9999-9999-999999999999', 'Designing Data-Intensive Applications', 'O''Reilly', 'book', 'completed', 100, '2020-01-01', '2020-03-01');

insert into careerops.learning_resource_skills (user_id, learning_resource_id, skill_id, relevance)
select '99999999-9999-9999-9999-999999999999', lr.id, sk.id, x.relevance
from careerops.learning_resources lr
join lateral (values
  ('Kubernetes the Hard Way', 'kubernetes', 3),
  ('HashiCorp Terraform Associate Path', 'terraform', 3),
  ('Designing Data-Intensive Applications', 'postgresql', 2),
  ('Designing Data-Intensive Applications', 'observability', 2)
) as x(title, skill_slug, relevance) on x.title = lr.title
join careerops.skills sk on sk.slug = x.skill_slug and sk.user_id = '99999999-9999-9999-9999-999999999999';

insert into careerops.credentials (user_id, name, issuer, status, visibility, learning_resource_id)
select '99999999-9999-9999-9999-999999999999', 'HashiCorp Certified: Terraform Associate', 'HashiCorp', 'planned', 'cv_safe', id
from careerops.learning_resources where title = 'HashiCorp Terraform Associate Path';

-- ============================================================================
-- 4.3 Projects, decisions, benchmarks, evidence
-- ============================================================================

insert into careerops.projects (
  user_id, name, slug, employment_id, kind, role, ownership, problem, solution, result,
  operational_status, started_at, ip_owner, code_visibility, repo_url, visibility, disclosure_status
)
select
  '99999999-9999-9999-9999-999999999999', 'GreenGrid Platform', 'greengrid-platform', id,
  'product', 'Platform lead', 'lead',
  'Homeowners and installers had no unified way to monitor solar, battery and inverter hardware from multiple vendors.',
  'An edge gateway that normalizes telemetry from mixed-vendor inverters and a mobile app that presents it in real time, feeding a cloud ingestion API.',
  'Rolled out to 2,000+ residential sites across 3 countries with 99.9% gateway uptime.',
  'production', '2021-06-01', 'employer', 'employer_owned', null, 'portfolio_public', 'approved'
from careerops.employments where organization = 'GridWorks Energy GmbH';

insert into careerops.projects (
  user_id, name, slug, parent_project_id, employment_id, kind, role, ownership,
  operational_status, started_at, ip_owner, code_visibility, visibility, disclosure_status
)
select '99999999-9999-9999-9999-999999999999', 'GreenGrid Home', 'greengrid-home', p.id, p.employment_id,
  'product', 'Core contributor (mobile + API integration)', 'core_contributor',
  'production', '2021-08-01', 'employer', 'employer_owned', 'portfolio_public', 'approved'
from careerops.projects p where p.slug = 'greengrid-platform';

insert into careerops.projects (
  user_id, name, slug, parent_project_id, employment_id, kind, role, ownership,
  operational_status, started_at, ip_owner, code_visibility, visibility, disclosure_status
)
select '99999999-9999-9999-9999-999999999999', 'GreenGrid Gateway', 'greengrid-gateway', p.id, p.employment_id,
  'infrastructure', 'Platform lead (edge fleet)', 'lead',
  'production', '2021-06-01', 'employer', 'employer_owned', 'portfolio_public', 'approved'
from careerops.projects p where p.slug = 'greengrid-platform';

insert into careerops.projects (
  user_id, name, slug, kind, role, ownership, problem, solution, result,
  operational_status, started_at, ip_owner, code_visibility, repo_url, visibility, disclosure_status
) values (
  '99999999-9999-9999-9999-999999999999', 'pgshield', 'pgshield',
  'lab', 'Sole maintainer', 'sole',
  'Postgres projects with Row Level Security regularly ship a table with RLS enabled but no policies, or vice versa, and find out in production.',
  'A CLI that connects to a database and reports every table missing RLS, missing policies, or with untested policies.',
  'Adopted by a handful of small open-source projects; 40+ GitHub stars.',
  'maintained', '2023-02-01', 'self', 'public', 'https://example.invalid/elena-voss-demo/pgshield',
  'portfolio_public', 'not_required'
);

insert into careerops.project_decisions (user_id, project_id, title, context, decision, alternatives, consequences, decided_at, visibility)
select '99999999-9999-9999-9999-999999999999', id, d.title, d.context, d.decision, d.alternatives, d.consequences, d.decided_at::date, 'portfolio_public'
from careerops.projects,
  lateral (values
    (
      'Edge buffering strategy for intermittent connectivity',
      'Residential gateways lose connectivity for minutes to hours (Wi-Fi drops, ISP outages) and must not lose telemetry.',
      'Buffer readings locally on the gateway in an append-only log and replay them to the ingestion API on reconnect, deduplicated by a monotonic per-device sequence number.',
      'Considered dropping stale readings after a timeout; considered a client-side retry queue with fixed backoff and no dedup.',
      'Adds local storage and a small reconciliation window on the API, but readings are never silently lost.',
      '2021-09-15'
    ),
    (
      'Single multi-tenant ingestion API vs. per-installer services',
      'Each installer partner initially wanted a dedicated ingestion endpoint and data model.',
      'One multi-tenant ingestion API with a shared schema and per-tenant scoping, instead of per-installer services.',
      'Per-installer microservices; a shared database with no tenant isolation at all.',
      'Faster onboarding for new installer partners and one place to fix ingestion bugs, at the cost of a shared blast radius that the on-call rotation has to account for.',
      '2022-01-20'
    )
  ) as d(title, context, decision, alternatives, consequences, decided_at)
where slug = 'greengrid-platform';

insert into careerops.evidence (user_id, type, title, description, project_id, occurred_from, occurred_to, verified_at, visibility)
select '99999999-9999-9999-9999-999999999999', 'production_deployment'::careerops.evidence_type,
  'GreenGrid Gateway fleet rollout (2,000+ sites)',
  'Rolled the edge gateway out across residential sites in 3 countries, coordinating firmware updates in staged waves.',
  id, '2022-01-01', null, now() - interval '45 days', 'portfolio_public'
from careerops.projects where slug = 'greengrid-gateway';

insert into careerops.evidence (user_id, type, title, description, project_id, occurred_from, verified_at, visibility)
select '99999999-9999-9999-9999-999999999999', 'design_document'::careerops.evidence_type,
  'Edge buffering & offline sync design',
  'Design document for the gateway''s local buffering and replay-on-reconnect strategy.',
  id, '2021-09-10', now() - interval '50 days', 'portfolio_public'
from careerops.projects where slug = 'greengrid-platform';

insert into careerops.evidence (user_id, type, title, description, project_id, occurred_from, occurred_to, verified_at, visibility)
select '99999999-9999-9999-9999-999999999999', 'incident_record'::careerops.evidence_type,
  'Regional gateway connectivity outage postmortem',
  'Postmortem for a regional ISP outage that affected gateway reporting for ~6 hours; buffering prevented data loss.',
  id, '2023-03-11', '2023-03-11', now() - interval '80 days', 'cv_safe'
from careerops.projects where slug = 'greengrid-gateway';

insert into careerops.evidence (user_id, type, title, description, project_id, occurred_from, verified_at, visibility)
select '99999999-9999-9999-9999-999999999999', 'release'::careerops.evidence_type,
  'GreenGrid Home v3.0 multi-vendor release',
  'Shipped multi-vendor inverter support in the mobile app, the top-requested feature from installer partners.',
  id, '2023-06-01', now() - interval '70 days', 'portfolio_public'
from careerops.projects where slug = 'greengrid-home';

insert into careerops.evidence (user_id, type, title, description, occurred_from, verified_at, visibility)
values (
  '99999999-9999-9999-9999-999999999999', 'certification', 'AWS Certified Solutions Architect - Associate',
  'Certification exam covering AWS architecture, security and cost fundamentals.',
  '2022-05-15', now() - interval '200 days', 'cv_safe'
);

insert into careerops.evidence (user_id, type, title, description, project_id, url, occurred_from, verified_at, visibility)
select '99999999-9999-9999-9999-999999999999', 'repository'::careerops.evidence_type,
  'pgshield public repository',
  'Open-source CLI for auditing Postgres Row Level Security coverage.',
  id, 'https://example.invalid/elena-voss-demo/pgshield', '2023-02-01', now() - interval '30 days', 'portfolio_public'
from careerops.projects where slug = 'pgshield';

insert into careerops.evidence (user_id, type, title, description, employment_id, occurred_from, visibility)
select '99999999-9999-9999-9999-999999999999', 'work_experience'::careerops.evidence_type,
  'Operated a multi-region Postgres fleet for 3+ years',
  'Ongoing operational ownership; not yet written up and confirmed.',
  id, '2021-03-01', 'cv_safe'
from careerops.employments where organization = 'GridWorks Energy GmbH';

insert into careerops.evidence (user_id, type, title, description, employment_id, occurred_from, verified_at, visibility)
select '99999999-9999-9999-9999-999999999999', 'documentation'::careerops.evidence_type,
  'Internal platform onboarding runbook',
  'Runbook used to onboard new platform team members.',
  id, '2022-08-01', now() - interval '100 days', 'private'
from careerops.employments where organization = 'GridWorks Energy GmbH';

insert into careerops.project_benchmarks (user_id, project_id, capability, own_status, own_evidence_id, competitor, competitor_status, competitor_source_url, checked_at, visibility)
select '99999999-9999-9999-9999-999999999999', p.id, b.capability, b.own_status::careerops.benchmark_own_status,
  ev.id, b.competitor, b.competitor_status::careerops.benchmark_competitor_status, b.source_url, current_date - 30, 'portfolio_public'
from careerops.projects p
join lateral (values
  ('Real-time multi-vendor inverter telemetry', 'implemented', 'GreenGrid Gateway fleet rollout (2,000+ sites)', 'Enphase Enlighten', 'yes', 'https://example.invalid/reviews/enphase-enlighten'),
  ('Mixed-vendor inverter support on one site', 'implemented', 'GreenGrid Gateway fleet rollout (2,000+ sites)', 'SolarEdge Monitoring', 'no', 'https://example.invalid/reviews/solaredge-monitoring'),
  ('Home battery dispatch scheduling', 'partial', 'GreenGrid Home v3.0 multi-vendor release', 'Tesla App', 'yes', 'https://example.invalid/reviews/tesla-app')
) as b(capability, own_status, evidence_title, competitor, competitor_status, source_url) on true
join careerops.evidence ev on ev.title = b.evidence_title and ev.user_id = '99999999-9999-9999-9999-999999999999'
where p.slug = 'greengrid-platform';

insert into careerops.project_benchmarks (user_id, project_id, capability, own_status, competitor, competitor_status, competitor_source_url, checked_at, visibility)
select '99999999-9999-9999-9999-999999999999', id, 'Utility bill reconciliation', 'absent', 'Enphase Enlighten', 'partial',
  'https://example.invalid/reviews/enphase-enlighten', current_date - 30, 'portfolio_public'
from careerops.projects where slug = 'greengrid-platform';

insert into careerops.evidence_skills (user_id, evidence_id, skill_id, strength, demonstrated_level, rationale, suggested_by, confirmed_at)
select '99999999-9999-9999-9999-999999999999', ev.id, sk.id, x.strength, x.demonstrated_level, x.rationale, 'user'::careerops.evidence_suggested_by,
  case when x.confirmed then now() - interval '20 days' else null end
from careerops.evidence ev
join lateral (values
  ('GreenGrid Gateway fleet rollout (2,000+ sites)', 'kubernetes', 3, 5, 'Coordinated multi-region cluster rollout for the fleet.', true),
  ('GreenGrid Gateway fleet rollout (2,000+ sites)', 'observability', 2, 4, 'Built fleet health dashboards for the rollout.', true),
  ('GreenGrid Gateway fleet rollout (2,000+ sites)', 'incident-response', 1, null, 'On call during the rollout waves.', true),
  ('Edge buffering & offline sync design', 'networking-fundamentals', 3, null, 'Designed around intermittent connectivity.', true),
  ('Edge buffering & offline sync design', 'python', 1, null, 'Prototyped the buffering logic in Python before the Go rewrite.', true),
  ('Regional gateway connectivity outage postmortem', 'incident-response', 3, 5, 'Led the postmortem and follow-up actions.', true),
  ('Regional gateway connectivity outage postmortem', 'observability', 2, null, 'Used fleet dashboards to scope the impact.', true),
  ('GreenGrid Home v3.0 multi-vendor release', 'release-engineering', 3, null, 'Owned the release end to end.', true),
  ('GreenGrid Home v3.0 multi-vendor release', 'kubernetes', 1, null, 'Release pipeline runs on the same cluster.', true),
  ('AWS Certified Solutions Architect - Associate', 'aws', 3, 4, 'Certification exam result.', true),
  ('AWS Certified Solutions Architect - Associate', 'iam', 2, null, 'IAM is a core exam domain.', true),
  ('pgshield public repository', 'postgresql', 3, 5, 'Built on deep Postgres RLS knowledge.', true),
  ('pgshield public repository', 'go', 2, 4, 'CLI is written in Go.', true),
  ('pgshield public repository', 'identity-access-management', 2, null, 'The tool audits IAM-adjacent RLS policies.', true),
  ('Operated a multi-region Postgres fleet for 3+ years', 'postgresql', 2, null, 'Not yet confirmed pending write-up.', false),
  ('Internal platform onboarding runbook', 'bash-scripting', 1, null, 'Runbook includes operational scripts.', true),
  ('Internal platform onboarding runbook', 'ansible', 1, null, 'Runbook covers config management steps.', true)
) as x(evidence_title, skill_slug, strength, demonstrated_level, rationale, confirmed) on x.evidence_title = ev.title
join careerops.skills sk on sk.slug = x.skill_slug and sk.user_id = '99999999-9999-9999-9999-999999999999'
where ev.user_id = '99999999-9999-9999-9999-999999999999';

-- ============================================================================
-- 4.5 Market
-- ============================================================================

insert into careerops.target_roles (user_id, name, family, tier, weight, seniority_band, comp_floor, comp_currency, comp_period, comp_basis, accepted_contract_types)
values
  ('99999999-9999-9999-9999-999999999999', 'Cloud & Platform Engineering', 'cloud', 'primary', 0.9, 'Senior/Staff', 75000, 'EUR', 'year', 'gross', array['employment', 'b2b_contract']),
  ('99999999-9999-9999-9999-999999999999', 'DevOps / SRE', 'devops', 'primary', 0.85, 'Senior', 70000, 'EUR', 'year', 'gross', array['employment', 'b2b_contract']),
  ('99999999-9999-9999-9999-999999999999', 'Security Engineering', 'security', 'bridge', 0.5, 'Mid/Senior', 65000, 'EUR', 'year', 'gross', array['employment']),
  ('99999999-9999-9999-9999-999999999999', 'Technical Support Leadership', 'support', 'fallback', 0.2, 'Lead', 55000, 'EUR', 'year', 'gross', array['employment']);

insert into careerops.organizations (user_id, name, origin_country, sector, local_presence, known_systems, need_hypothesis, need_signals, employer_tier, source_urls, researched_at, visibility)
values
  ('99999999-9999-9999-9999-999999999999', 'NorthGrid Systems', 'DE', 'energy-tech',
    'HQ in Munich, ~180 employees, offices in Munich and Warsaw (as of 2026-06, self-reported).',
    'In-house monitoring app plus a third-party ingestion gateway they are looking to replace.',
    'In-house edge-to-cloud telemetry for distributed residential energy assets, currently outsourced.',
    array['open Staff SRE and Senior Platform Engineer roles', 'recent blog post about "bringing telemetry in-house"'],
    'a_builds_same_domain', array['https://example.invalid/northgrid/careers'], current_date - 20, 'private'),
  ('99999999-9999-9999-9999-999999999999', 'Meridian Cloud Labs', 'DE', 'cloud infrastructure consultancy',
    'Berlin-based, ~40 employees.',
    'Client-facing Kubernetes and Terraform platform work across multiple industries.',
    'Senior platform engineers who can lead client engagements with minimal ramp-up.',
    array['referral from a former Open Source Foundry colleague'],
    'b_same_engineering_problems', array['https://example.invalid/meridian-cloud-labs'], current_date - 15, 'private'),
  ('99999999-9999-9999-9999-999999999999', 'Fenwick Logistics', 'NL', 'logistics / IoT',
    'Rotterdam-based, warehouse and last-mile tracking hardware.',
    'Fleet of tracking devices reporting over cellular to a central platform.',
    'Reliability engineering for a device fleet with intermittent connectivity, a problem already solved at GreenGrid.',
    array['open Site Reliability Engineer role mentioning "device fleet reliability"'],
    'c_operates_the_problem', array['https://example.invalid/fenwick-logistics/careers'], current_date - 10, 'private'),
  ('99999999-9999-9999-9999-999999999999', 'Arcline Robotics', 'DE', 'warehouse robotics',
    'Leipzig-based, ~90 employees.',
    'Robot fleet management platform with a security team of two.',
    'Security engineering capacity for a growing fleet management platform.',
    array['open Security Engineer role'],
    'b_same_engineering_problems', array['https://example.invalid/arcline-robotics'], current_date - 40, 'private'),
  ('99999999-9999-9999-9999-999999999999', 'Solstice Utilities', 'AT', 'utility / energy',
    'Vienna-based regional utility with a digital metering initiative.',
    'Legacy metering backend being modernized; public tenders mention "cloud-native platform".',
    'In-house platform capability to run the digital metering rollout instead of relying entirely on vendors.',
    array['public tender documents', 'open Platform Reliability Lead role'],
    'a_builds_same_domain', array['https://example.invalid/solstice-utilities'], current_date - 25, 'private');

insert into careerops.contacts (user_id, organization_id, name, title, is_role_hypothesis, channel, notes)
select '99999999-9999-9999-9999-999999999999', id, 'Head of Platform Engineering', 'Head of Platform Engineering', true, 'linkedin', 'Role hypothesis; no name identified yet.'
from careerops.organizations where name = 'NorthGrid Systems';

insert into careerops.contacts (user_id, organization_id, name, title, is_role_hypothesis, channel, notes)
select '99999999-9999-9999-9999-999999999999', id, 'Mara Lindqvist', 'Engagement Manager', false, 'referral', 'Introduced by a former Open Source Foundry colleague.'
from careerops.organizations where name = 'Meridian Cloud Labs';

insert into careerops.jobs (user_id, target_role_id, organization_id, company, title, location, remote_policy, seniority, employment_type, source_kind, source_url, raw_text, url_hash, content_hash, language, posted_at, status, relevance)
select
  '99999999-9999-9999-9999-999999999999', tr.id, org.id, j.company, j.title, j.location, j.remote_policy::careerops.remote_policy,
  j.seniority, 'full_time', 'paste'::careerops.job_source_kind, j.source_url, j.raw_text,
  md5(j.source_url), md5(j.raw_text), 'en', j.posted_at::date, j.status::careerops.job_status, j.relevance
from (values
  ('NorthGrid Systems', 'Senior Platform Engineer', 'Cloud & Platform Engineering', 'Munich, Germany', 'hybrid', 'Senior',
    'https://example.invalid/jobs/northgrid-senior-platform-engineer',
    'NorthGrid Systems is hiring a Senior Platform Engineer to own our Kubernetes platform and bring edge telemetry ingestion in-house. Requirements: 5+ years with Kubernetes and Terraform in production, experience with edge or IoT fleets a plus, fluent English, based in the EU.',
    '2026-08-10', 'reviewed', 2),
  ('Meridian Cloud Labs', 'DevOps Engineer', 'DevOps / SRE', 'Berlin, Germany', 'remote', 'Mid/Senior',
    'https://example.invalid/jobs/meridian-devops-engineer',
    'Meridian Cloud Labs seeks a DevOps Engineer for client Kubernetes and Terraform engagements. 3+ years of relevant experience, comfortable working directly with client teams, German not required.',
    '2026-07-22', 'parsed', 1),
  ('Solstice Utilities', 'Cloud Infrastructure Engineer', 'Cloud & Platform Engineering', 'Vienna, Austria', 'hybrid', 'Senior',
    'https://example.invalid/jobs/solstice-cloud-infrastructure-engineer',
    'Solstice Utilities is modernizing its metering backend and needs a Cloud Infrastructure Engineer. AWS or equivalent cloud experience required, Terraform strongly preferred, EU work authorization required.',
    '2026-08-01', 'reviewed', 2),
  ('Fenwick Logistics', 'Site Reliability Engineer', 'DevOps / SRE', 'Rotterdam, Netherlands', 'onsite', 'Mid/Senior',
    'https://example.invalid/jobs/fenwick-site-reliability-engineer',
    'Fenwick Logistics is looking for a Site Reliability Engineer to improve reliability of our device fleet reporting pipeline. Experience with intermittent-connectivity systems is a strong plus.',
    '2026-08-15', 'new', 1),
  ('Arcline Robotics', 'Security Engineer', 'Security Engineering', 'Leipzig, Germany', 'hybrid', 'Mid',
    'https://example.invalid/jobs/arcline-security-engineer',
    'Arcline Robotics is hiring a Security Engineer to grow our two-person security team covering a robot fleet management platform. IAM and threat modeling experience required.',
    '2026-06-30', 'parsed', 1),
  ('Generic Corp', 'Frontend Developer', null, 'Remote', 'remote', 'Mid',
    'https://example.invalid/jobs/genericcorp-frontend-developer',
    'Generic Corp is hiring a Frontend Developer with React experience. Not a fit for an infrastructure background.',
    '2026-05-01', 'archived', 0),
  ('DataCo', 'Data Analyst', null, 'Remote', 'remote', 'Mid',
    'https://example.invalid/jobs/dataco-data-analyst',
    'DataCo is hiring a Data Analyst with SQL and dashboarding experience.',
    '2026-05-10', 'archived', 0),
  ('NorthGrid Systems', 'Staff SRE', 'DevOps / SRE', 'Munich, Germany', 'hybrid', 'Staff',
    'https://example.invalid/jobs/northgrid-staff-sre',
    'NorthGrid Systems is hiring a Staff SRE to define reliability practices across the platform organization. 7+ years of relevant experience expected.',
    '2026-08-20', 'reviewed', 2),
  ('Meridian Cloud Labs', 'Cloud Security Engineer', 'Security Engineering', 'Berlin, Germany', 'remote', 'Senior',
    'https://example.invalid/jobs/meridian-cloud-security-engineer',
    'Meridian Cloud Labs is looking for a Cloud Security Engineer to support client engagements with an IAM and threat modeling focus.',
    '2026-08-25', 'new', 1),
  ('BuildRight', 'Construction Project Manager', null, 'Berlin, Germany', 'onsite', 'Senior',
    'https://example.invalid/jobs/buildright-construction-pm',
    'BuildRight is hiring a Construction Project Manager. Not related to software.',
    '2026-04-15', 'archived', 0),
  ('Solstice Utilities', 'Platform Reliability Lead', 'Cloud & Platform Engineering', 'Vienna, Austria', 'hybrid', 'Staff',
    'https://example.invalid/jobs/solstice-platform-reliability-lead',
    'Solstice Utilities seeks a Platform Reliability Lead to own reliability practices for the new metering platform. Kubernetes and incident response leadership experience required.',
    '2026-07-05', 'parsed', 2),
  ('Fenwick Logistics', 'DevOps / Platform Engineer', 'DevOps / SRE', 'Rotterdam, Netherlands', 'hybrid', 'Mid/Senior',
    'https://example.invalid/jobs/fenwick-devops-platform-engineer',
    'Fenwick Logistics is expanding its platform team. Looking for a DevOps / Platform Engineer with Kubernetes and Terraform experience.',
    '2026-08-05', 'new', 1)
) as j(company, title, target_role_name, location, remote_policy, seniority, source_url, raw_text, posted_at, status, relevance)
left join careerops.target_roles tr on tr.name = j.target_role_name and tr.user_id = '99999999-9999-9999-9999-999999999999'
left join careerops.organizations org on org.name = j.company and org.user_id = '99999999-9999-9999-9999-999999999999';

insert into careerops.job_requirements (user_id, job_id, kind, skill_id, raw_text, importance, required_level, years, is_hard_constraint, mapping_status, extracted_by)
select '99999999-9999-9999-9999-999999999999', j.id, r.kind::careerops.requirement_kind, sk.id, r.raw_text, r.importance::careerops.requirement_importance,
  r.required_level, r.years, r.is_hard_constraint, r.mapping_status::careerops.requirement_mapping_status, 'dictionary'::careerops.requirement_extracted_by
from careerops.jobs j
join lateral (values
  ('Senior Platform Engineer', 'skill', 'kubernetes', '5+ years with Kubernetes ... in production', 'required', 4, 5, false, 'confirmed'),
  ('Senior Platform Engineer', 'skill', 'terraform', '... and Terraform in production', 'required', 4, 5, false, 'confirmed'),
  ('Senior Platform Engineer', 'language', null, 'fluent English', 'required', null, null, true, 'confirmed'),
  ('Senior Platform Engineer', 'location', null, 'based in the EU', 'required', null, null, true, 'confirmed'),
  ('DevOps Engineer', 'skill', 'kubernetes', 'client Kubernetes and Terraform engagements', 'required', 3, 3, false, 'confirmed'),
  ('DevOps Engineer', 'experience_years', null, '3+ years of relevant experience', 'required', null, 3, true, 'confirmed'),
  ('Cloud Infrastructure Engineer', 'skill', 'aws', 'AWS or equivalent cloud experience required', 'required', 4, null, false, 'confirmed'),
  ('Cloud Infrastructure Engineer', 'skill', 'terraform', 'Terraform strongly preferred', 'preferred', 3, null, false, 'confirmed'),
  ('Cloud Infrastructure Engineer', 'work_authorization', null, 'EU work authorization required', 'required', null, null, true, 'confirmed'),
  ('Security Engineer', 'skill', 'identity-access-management', 'IAM ... experience required', 'required', 3, null, false, 'confirmed'),
  ('Security Engineer', 'skill', 'threat-modeling', '... and threat modeling experience required', 'required', 3, null, false, 'confirmed'),
  ('Staff SRE', 'experience_years', null, '7+ years of relevant experience expected', 'required', null, 7, true, 'confirmed'),
  ('Platform Reliability Lead', 'skill', 'kubernetes', 'Kubernetes and incident response leadership experience required', 'required', 4, null, false, 'confirmed'),
  ('Platform Reliability Lead', 'skill', 'incident-response', 'incident response leadership experience required', 'required', 4, null, false, 'confirmed'),
  ('DevOps / Platform Engineer', 'skill', 'kubernetes', 'Kubernetes and Terraform experience', 'required', 3, null, false, 'unmapped')
) as r(job_title, kind, skill_slug, raw_text, importance, required_level, years, is_hard_constraint, mapping_status) on r.job_title = j.title
left join careerops.skills sk on sk.slug = r.skill_slug and sk.user_id = '99999999-9999-9999-9999-999999999999'
where j.user_id = '99999999-9999-9999-9999-999999999999';

-- ============================================================================
-- 4.6 Scoring snapshots
-- ============================================================================

insert into careerops.scoring_configs (user_id, version, weights, thresholds, is_active)
values (
  '99999999-9999-9999-9999-999999999999', '2026.1',
  '{"evidence_confidence": 0.4, "market_frequency": 0.35, "recency": 0.25}'::jsonb,
  '{"gap_learn_below": 2, "gap_prove_below": 4}'::jsonb,
  true
);

insert into careerops.skill_scores (
  user_id, user_skill_id, target_role_id, scoring_version, scoring_config_id, breakdown,
  assessed_level, supported_level, effective_level, evidence_confidence, market_frequency, target_level, gap_type, gap_priority
)
select '99999999-9999-9999-9999-999999999999', us.id, tr.id, '2026.1', sc.id,
  jsonb_build_object('note', 'demo snapshot'), x.assessed_level, x.supported_level, x.effective_level,
  x.evidence_confidence, x.market_frequency, x.target_level, x.gap_type::careerops.gap_type, x.gap_priority
from careerops.user_skills us
join careerops.skills sk on sk.id = us.skill_id
join careerops.scoring_configs sc on sc.version = '2026.1' and sc.user_id = '99999999-9999-9999-9999-999999999999'
cross join careerops.target_roles tr
join lateral (values
  ('kubernetes', 'Cloud & Platform Engineering', 4, 4, 4, 0.9, 0.8, 5, 'prove', 0.6),
  ('terraform', 'Cloud & Platform Engineering', 4, 4, 4, 0.9, 0.75, 4, 'none', 0.1),
  ('aws', 'Cloud & Platform Engineering', 4, 4, 4, 0.85, 0.9, 5, 'prove', 0.5),
  ('threat-modeling', 'Security Engineering', 2, 1, 2, 0.4, 0.5, 3, 'learn', 0.8),
  ('incident-response', 'DevOps / SRE', 3, 3, 3, 0.7, 0.6, 4, 'prove', 0.4)
) as x(skill_slug, role_name, assessed_level, supported_level, effective_level, evidence_confidence, market_frequency, target_level, gap_type, gap_priority)
  on x.skill_slug = sk.slug and x.role_name = tr.name
where us.user_id = '99999999-9999-9999-9999-999999999999';

insert into careerops.job_matches (user_id, job_id, scoring_version, scoring_config_id, breakdown, score, constraint_gate)
select '99999999-9999-9999-9999-999999999999', j.id, '2026.1', sc.id, jsonb_build_object('note', 'demo snapshot'), x.score, x.constraint_gate::careerops.constraint_gate
from careerops.jobs j
join careerops.scoring_configs sc on sc.version = '2026.1' and sc.user_id = '99999999-9999-9999-9999-999999999999'
join lateral (values
  ('Senior Platform Engineer', 88, 'pass'),
  ('Cloud Infrastructure Engineer', 82, 'pass'),
  ('Staff SRE', 79, 'warn'),
  ('Platform Reliability Lead', 91, 'pass')
) as x(title, score, constraint_gate) on x.title = j.title
where j.user_id = '99999999-9999-9999-9999-999999999999';

insert into careerops.readiness_snapshots (user_id, target_role_id, scoring_version, scoring_config_id, breakdown, score, sample_size, sufficient_data)
select '99999999-9999-9999-9999-999999999999', tr.id, '2026.1', sc.id, jsonb_build_object('note', 'demo snapshot'), x.score, x.sample_size, x.sufficient_data
from careerops.target_roles tr
join careerops.scoring_configs sc on sc.version = '2026.1' and sc.user_id = '99999999-9999-9999-9999-999999999999'
join lateral (values
  ('Cloud & Platform Engineering', 84, 4, true),
  ('DevOps / SRE', 78, 4, true),
  ('Security Engineering', 42, 2, false),
  ('Technical Support Leadership', 65, 1, false)
) as x(role_name, score, sample_size, sufficient_data) on x.role_name = tr.name
where tr.user_id = '99999999-9999-9999-9999-999999999999';

-- ============================================================================
-- 4.9 System
-- ============================================================================

insert into careerops.ai_analyses (user_id, kind, provider, model, prompt_version, input_refs, output, status, decision, latency_ms, requested_at, completed_at)
select '99999999-9999-9999-9999-999999999999', 'job_extraction'::careerops.ai_analysis_kind, 'local', 'demo-extractor', 'v1',
  jsonb_build_object('job_id', j.id), jsonb_build_object('requirements_found', 4), 'succeeded'::careerops.ai_analysis_status, 'accepted'::careerops.ai_analysis_decision,
  820, now() - interval '5 days', now() - interval '5 days' + interval '820 milliseconds'
from careerops.jobs j where j.title = 'Senior Platform Engineer';

insert into careerops.ai_analyses (user_id, kind, provider, model, prompt_version, input_refs, status, requested_at)
select '99999999-9999-9999-9999-999999999999', 'evidence_mapping'::careerops.ai_analysis_kind, 'local', 'demo-mapper', 'v1',
  jsonb_build_object('evidence_id', id), 'pending'::careerops.ai_analysis_status, now() - interval '1 hour'
from careerops.evidence where title = 'Operated a multi-region Postgres fleet for 3+ years';

insert into careerops.settings (user_id, key, value) values
  ('99999999-9999-9999-9999-999999999999', 'locale', '"en"'::jsonb),
  ('99999999-9999-9999-9999-999999999999', 'weekly_digest_enabled', 'true'::jsonb);

insert into careerops.audit_log (user_id, entity, entity_id, action, changed_fields, actor, details)
select '99999999-9999-9999-9999-999999999999', 'employments', id, 'update', array['disclosure_status'], 'user'::careerops.audit_actor,
  jsonb_build_object('from', 'not_required', 'to', 'approved')
from careerops.employments where organization = 'GridWorks Energy GmbH';

insert into careerops.audit_log (user_id, entity, entity_id, action, changed_fields, actor, details)
select '99999999-9999-9999-9999-999999999999', 'project_benchmarks', id, 'insert', array[]::text[], 'ai_worker'::careerops.audit_actor,
  jsonb_build_object('suggested_competitor', 'Enphase Enlighten')
from careerops.project_benchmarks where capability = 'Real-time multi-vendor inverter telemetry';

-- ============================================================================
-- 4.8 Documents and opportunities
-- ============================================================================

insert into careerops.documents (user_id, kind, title, target_role_id)
select '99999999-9999-9999-9999-999999999999', 'cv'::careerops.document_kind, 'Elena Voss - Platform Engineer CV', id
from careerops.target_roles where name = 'Cloud & Platform Engineering';

insert into careerops.documents (user_id, kind, title, project_id)
select '99999999-9999-9999-9999-999999999999', 'case_study'::careerops.document_kind, 'GreenGrid: An Edge-to-Cloud Energy Platform', id
from careerops.projects where slug = 'greengrid-platform';

insert into careerops.documents (user_id, kind, title, organization_id)
select '99999999-9999-9999-9999-999999999999', 'cover_letter'::careerops.document_kind, 'Cover letter - NorthGrid Systems', id
from careerops.organizations where name = 'NorthGrid Systems';

insert into careerops.documents (user_id, kind, title, project_id)
select '99999999-9999-9999-9999-999999999999', 'one_pager'::careerops.document_kind, 'GreenGrid Gateway - one pager', id
from careerops.projects where slug = 'greengrid-gateway';

insert into careerops.document_versions (user_id, document_id, version, rendered_md, generator)
select '99999999-9999-9999-9999-999999999999', id, 1, '# Elena Voss\n\nPlatform Engineer CV (demo content).', 'manual'::careerops.document_generator
from careerops.documents where title = 'Elena Voss - Platform Engineer CV';

insert into careerops.document_versions (user_id, document_id, version, rendered_md, generator)
select '99999999-9999-9999-9999-999999999999', id, 1, '# GreenGrid: An Edge-to-Cloud Energy Platform\n\n(demo case study content).', 'manual'::careerops.document_generator
from careerops.documents where title = 'GreenGrid: An Edge-to-Cloud Energy Platform';

insert into careerops.document_versions (user_id, document_id, version, rendered_md, generator)
select '99999999-9999-9999-9999-999999999999', id, 1, 'Dear NorthGrid Systems team, (demo cover letter content).', 'manual'::careerops.document_generator
from careerops.documents where title = 'Cover letter - NorthGrid Systems';

insert into careerops.document_versions (user_id, document_id, version, rendered_md, generator)
select '99999999-9999-9999-9999-999999999999', id, 1, '# GreenGrid Gateway\n\n(demo one-pager content).', 'manual'::careerops.document_generator
from careerops.documents where title = 'GreenGrid Gateway - one pager';

insert into careerops.document_sources (user_id, document_version_id, section, employment_highlight_id)
select '99999999-9999-9999-9999-999999999999', dv.id, 'highlights', eh.id
from careerops.document_versions dv
join careerops.documents d on d.id = dv.document_id and d.title = 'Elena Voss - Platform Engineer CV'
join careerops.employment_highlights eh on eh.text like 'Migrated the platform team%';

insert into careerops.document_sources (user_id, document_version_id, section, education_id)
select '99999999-9999-9999-9999-999999999999', dv.id, 'education', ed.id
from careerops.document_versions dv
join careerops.documents d on d.id = dv.document_id and d.title = 'Elena Voss - Platform Engineer CV'
join careerops.education ed on ed.institution = 'Technical University of Berlin';

insert into careerops.document_sources (user_id, document_version_id, section, credential_id)
select '99999999-9999-9999-9999-999999999999', dv.id, 'credentials', c.id
from careerops.document_versions dv
join careerops.documents d on d.id = dv.document_id and d.title = 'Elena Voss - Platform Engineer CV'
join careerops.credentials c on c.name = 'AWS Certified Solutions Architect - Associate';

insert into careerops.document_sources (user_id, document_version_id, section, project_id)
select '99999999-9999-9999-9999-999999999999', dv.id, 'architecture', p.id
from careerops.document_versions dv
join careerops.documents d on d.id = dv.document_id and d.title = 'GreenGrid: An Edge-to-Cloud Energy Platform'
join careerops.projects p on p.slug = 'greengrid-platform';

insert into careerops.document_sources (user_id, document_version_id, section, project_decision_id)
select '99999999-9999-9999-9999-999999999999', dv.id, 'difficult_decisions', pd.id
from careerops.document_versions dv
join careerops.documents d on d.id = dv.document_id and d.title = 'GreenGrid: An Edge-to-Cloud Energy Platform'
join careerops.project_decisions pd on pd.title = 'Edge buffering strategy for intermittent connectivity';

insert into careerops.document_sources (user_id, document_version_id, section, project_benchmark_id)
select '99999999-9999-9999-9999-999999999999', dv.id, 'benchmarks', pb.id
from careerops.document_versions dv
join careerops.documents d on d.id = dv.document_id and d.title = 'GreenGrid: An Edge-to-Cloud Energy Platform'
join careerops.project_benchmarks pb on pb.capability = 'Real-time multi-vendor inverter telemetry';

insert into careerops.document_sources (user_id, document_version_id, section, evidence_id)
select '99999999-9999-9999-9999-999999999999', dv.id, 'summary', ev.id
from careerops.document_versions dv
join careerops.documents d on d.id = dv.document_id and d.title = 'GreenGrid Gateway - one pager'
join careerops.evidence ev on ev.title = 'GreenGrid Gateway fleet rollout (2,000+ sites)';

insert into careerops.opportunities (
  user_id, track, origin, organization_id, job_id, target_role_id, project_id, title, angle,
  fit, receptiveness, stage, outcome, job_match_id, expected_comp, comp_currency, comp_period, comp_basis,
  contract_type, remote_policy, terms_notes, first_contact_at, next_action, next_action_due
)
select
  '99999999-9999-9999-9999-999999999999', 'employment'::careerops.opportunity_track, 'job_ad'::careerops.opportunity_origin,
  org.id, j.id, tr.id, p.id, 'NorthGrid Systems - Senior Platform Engineer', 'Direct edge-fleet experience matching their in-housing plan.',
  5, 4, 'negotiation'::careerops.opportunity_stage, 'open'::careerops.opportunity_outcome, jm.id,
  85000, 'EUR', 'year'::careerops.comp_period, 'gross'::careerops.comp_basis, 'employment'::careerops.contract_type, 'hybrid'::careerops.remote_policy,
  'Verbal offer above target_roles floor; awaiting written contract.', now() - interval '30 days', 'Awaiting written offer', current_date + 5
from careerops.organizations org
join careerops.jobs j on j.title = 'Senior Platform Engineer' and j.user_id = org.user_id
join careerops.target_roles tr on tr.name = 'Cloud & Platform Engineering' and tr.user_id = org.user_id
join careerops.projects p on p.slug = 'greengrid-platform' and p.user_id = org.user_id
join careerops.job_matches jm on jm.job_id = j.id
where org.name = 'NorthGrid Systems';

insert into careerops.opportunities (user_id, track, origin, organization_id, target_role_id, project_id, title, angle, fit, receptiveness, stage, outcome, remote_policy, first_contact_at)
select '99999999-9999-9999-9999-999999999999', 'employment'::careerops.opportunity_track, 'outreach'::careerops.opportunity_origin,
  org.id, tr.id, p.id, 'Solstice Utilities - platform capability outreach',
  'I have already built the edge-to-cloud telemetry platform your metering rollout is scoping.',
  4, 3, 'conversation'::careerops.opportunity_stage, 'open'::careerops.opportunity_outcome, 'hybrid'::careerops.remote_policy, now() - interval '10 days'
from careerops.organizations org
join careerops.target_roles tr on tr.name = 'Cloud & Platform Engineering' and tr.user_id = org.user_id
join careerops.projects p on p.slug = 'greengrid-platform' and p.user_id = org.user_id
where org.name = 'Solstice Utilities';

insert into careerops.opportunities (user_id, track, origin, organization_id, title, stage, outcome, remote_policy, first_contact_at)
select '99999999-9999-9999-9999-999999999999', 'contract'::careerops.opportunity_track, 'referral'::careerops.opportunity_origin,
  id, 'Meridian Cloud Labs - referred contract engagement', 'contacted'::careerops.opportunity_stage, 'open'::careerops.opportunity_outcome,
  'remote'::careerops.remote_policy, now() - interval '5 days'
from careerops.organizations where name = 'Meridian Cloud Labs';

insert into careerops.opportunities (user_id, track, origin, organization_id, job_id, title, stage, outcome, remote_policy, first_contact_at)
select '99999999-9999-9999-9999-999999999999', 'employment'::careerops.opportunity_track, 'job_ad'::careerops.opportunity_origin,
  org.id, j.id, 'Fenwick Logistics - Site Reliability Engineer', 'evaluation'::careerops.opportunity_stage, 'open'::careerops.opportunity_outcome,
  'onsite'::careerops.remote_policy, now() - interval '14 days'
from careerops.organizations org
join careerops.jobs j on j.title = 'Site Reliability Engineer' and j.user_id = org.user_id
where org.name = 'Fenwick Logistics';

insert into careerops.opportunities (user_id, track, origin, organization_id, title, stage, outcome, remote_policy, first_contact_at)
select '99999999-9999-9999-9999-999999999999', 'employment'::careerops.opportunity_track, 'job_ad'::careerops.opportunity_origin,
  id, 'Arcline Robotics - Security Engineer', 'closed'::careerops.opportunity_stage, 'rejected'::careerops.opportunity_outcome,
  'hybrid'::careerops.remote_policy, now() - interval '60 days'
from careerops.organizations where name = 'Arcline Robotics';

insert into careerops.opportunities (user_id, track, origin, title, stage, outcome, remote_policy)
values (
  '99999999-9999-9999-9999-999999999999', 'consulting'::careerops.opportunity_track, 'inbound'::careerops.opportunity_origin,
  'Unattributed inbound consulting lead', 'identified'::careerops.opportunity_stage, 'open'::careerops.opportunity_outcome, 'unknown'::careerops.remote_policy
);

insert into careerops.opportunity_documents (user_id, opportunity_id, document_version_id, role)
select '99999999-9999-9999-9999-999999999999', o.id, dv.id, 'cv'::careerops.opportunity_document_role
from careerops.opportunities o
join careerops.document_versions dv on true
join careerops.documents d on d.id = dv.document_id and d.title = 'Elena Voss - Platform Engineer CV'
where o.title = 'NorthGrid Systems - Senior Platform Engineer';

insert into careerops.opportunity_documents (user_id, opportunity_id, document_version_id, role)
select '99999999-9999-9999-9999-999999999999', o.id, dv.id, 'cover_letter'::careerops.opportunity_document_role
from careerops.opportunities o
join careerops.document_versions dv on true
join careerops.documents d on d.id = dv.document_id and d.title = 'Cover letter - NorthGrid Systems'
where o.title = 'NorthGrid Systems - Senior Platform Engineer';

insert into careerops.opportunity_events (user_id, opportunity_id, type, from_stage, to_stage, occurred_at, note)
select '99999999-9999-9999-9999-999999999999', o.id, e.type::careerops.opportunity_event_type,
  e.from_stage::careerops.opportunity_stage, e.to_stage::careerops.opportunity_stage, e.occurred_at, e.note
from careerops.opportunities o,
  lateral (values
    ('stage_change', null, 'identified', now() - interval '35 days', 'Ad matched Cloud & Platform Engineering target role.'),
    ('stage_change', 'identified', 'researched', now() - interval '34 days', null),
    ('message_sent', 'researched', 'contacted', now() - interval '30 days', 'Application submitted.'),
    ('stage_change', 'contacted', 'conversation', now() - interval '26 days', 'Recruiter screen scheduled.'),
    ('interview', 'conversation', 'evaluation', now() - interval '20 days', 'Technical interview: platform design deep-dive.'),
    ('stage_change', 'evaluation', 'negotiation', now() - interval '8 days', 'Verbal offer received.')
  ) as e(type, from_stage, to_stage, occurred_at, note)
where o.title = 'NorthGrid Systems - Senior Platform Engineer';

insert into careerops.opportunity_events (user_id, opportunity_id, type, interview_kind, from_stage, to_stage, occurred_at, note)
select '99999999-9999-9999-9999-999999999999', id, 'interview'::careerops.opportunity_event_type, 'final'::careerops.interview_kind,
  'evaluation'::careerops.opportunity_stage, 'evaluation'::careerops.opportunity_stage, now() - interval '65 days', 'Final-round panel interview.'
from careerops.opportunities where title = 'Arcline Robotics - Security Engineer';

insert into careerops.opportunity_events (user_id, opportunity_id, type, from_stage, to_stage, occurred_at, note)
select '99999999-9999-9999-9999-999999999999', id, 'stage_change'::careerops.opportunity_event_type,
  'evaluation'::careerops.opportunity_stage, 'closed'::careerops.opportunity_stage, now() - interval '60 days', 'Not selected after the final interview.'
from careerops.opportunities where title = 'Arcline Robotics - Security Engineer';

-- ============================================================================
-- 4.7 Execution
-- ============================================================================

insert into careerops.roadmap_items (user_id, title, description, horizon, target_role_id, status, due_date, definition_of_done, requires_evidence)
select '99999999-9999-9999-9999-999999999999', 'Reach Staff-level readiness for Cloud & Platform roles',
  'Close the remaining gaps between current evidence and Staff-level expectations.', 'target'::careerops.roadmap_horizon, id,
  'active'::careerops.roadmap_status, null,
  '[{"text": "Ship 2 more production-benchmarked capabilities", "done": false}, {"text": "Earn CKA", "done": false}]'::jsonb,
  true
from careerops.target_roles where name = 'Cloud & Platform Engineering';

insert into careerops.roadmap_items (user_id, title, description, horizon, status, due_date, definition_of_done, requires_evidence)
values (
  '99999999-9999-9999-9999-999999999999', 'Close the CKA certification gap',
  'Finish the Certified Kubernetes Administrator exam.', 'd90', 'active', current_date + 45,
  '[{"text": "Pass the CKA exam", "done": false}]'::jsonb, true
);

insert into careerops.roadmap_items (user_id, title, description, horizon, status, definition_of_done, requires_evidence)
values (
  '99999999-9999-9999-9999-999999999999', 'Publish pgshield v1.0 and gather external users',
  'Get the RLS audit CLI to a stable public release.', 'm6', 'done',
  '[{"text": "Tag v1.0 and publish the repository", "done": true}]'::jsonb, true
);

insert into careerops.roadmap_item_skills (user_id, roadmap_item_id, skill_id, from_level, to_level)
select '99999999-9999-9999-9999-999999999999', ri.id, sk.id, x.from_level, x.to_level
from careerops.roadmap_items ri
join lateral (values
  ('Reach Staff-level readiness for Cloud & Platform roles', 'kubernetes', 4, 5),
  ('Close the CKA certification gap', 'kubernetes', 4, 5),
  ('Publish pgshield v1.0 and gather external users', 'go', 3, 4),
  ('Publish pgshield v1.0 and gather external users', 'postgresql', 4, 4)
) as x(item_title, skill_slug, from_level, to_level) on x.item_title = ri.title
join careerops.skills sk on sk.slug = x.skill_slug and sk.user_id = '99999999-9999-9999-9999-999999999999'
where ri.user_id = '99999999-9999-9999-9999-999999999999';

insert into careerops.roadmap_item_evidence (user_id, roadmap_item_id, evidence_id)
select '99999999-9999-9999-9999-999999999999', ri.id, ev.id
from careerops.roadmap_items ri
join careerops.evidence ev on ev.title = 'pgshield public repository'
where ri.title = 'Publish pgshield v1.0 and gather external users';

insert into careerops.roadmap_item_evidence (user_id, roadmap_item_id, evidence_id)
select '99999999-9999-9999-9999-999999999999', ri.id, ev.id
from careerops.roadmap_items ri
join careerops.evidence ev on ev.title = 'GreenGrid Gateway fleet rollout (2,000+ sites)'
where ri.title = 'Reach Staff-level readiness for Cloud & Platform roles';

insert into careerops.tasks (user_id, title, notes, status, is_focus, skill_id, roadmap_item_id)
select '99999999-9999-9999-9999-999999999999', 'Finish CKA practice exams', 'Two practice exams left before the real attempt.',
  'doing'::careerops.task_status, true, sk.id, ri.id
from careerops.skills sk, careerops.roadmap_items ri
where sk.slug = 'kubernetes' and sk.user_id = '99999999-9999-9999-9999-999999999999'
  and ri.title = 'Close the CKA certification gap';

insert into careerops.tasks (user_id, title, notes, status, is_focus, opportunity_id)
select '99999999-9999-9999-9999-999999999999', 'Draft NorthGrid negotiation counter-offer', 'Compare verbal offer against target role comp floor.',
  'todo'::careerops.task_status, true, id
from careerops.opportunities where title = 'NorthGrid Systems - Senior Platform Engineer';

insert into careerops.tasks (user_id, title, notes, status, is_focus, project_id, roadmap_item_id)
select '99999999-9999-9999-9999-999999999999', 'Write pgshield v1.0 release notes', null, 'done'::careerops.task_status, false, p.id, ri.id
from careerops.projects p, careerops.roadmap_items ri
where p.slug = 'pgshield' and ri.title = 'Publish pgshield v1.0 and gather external users';

insert into careerops.tasks (user_id, title, notes, status, is_focus, opportunity_id)
select '99999999-9999-9999-9999-999999999999', 'Follow up with Meridian Cloud Labs referral contact', null, 'todo'::careerops.task_status, true, id
from careerops.opportunities where title = 'Meridian Cloud Labs - referred contract engagement';

insert into careerops.tasks (user_id, title, notes, status, is_focus, job_id)
select '99999999-9999-9999-9999-999999999999', 'Review Fenwick Logistics job requirements for skill gaps', null, 'todo'::careerops.task_status, false, id
from careerops.jobs where title = 'Site Reliability Engineer';

insert into careerops.tasks (user_id, title, notes, status, is_focus, project_id)
select '99999999-9999-9999-9999-999999999999', 'Publish edge buffering design doc as a blog article', null, 'todo'::careerops.task_status, true, id
from careerops.projects where slug = 'greengrid-platform';

commit;
