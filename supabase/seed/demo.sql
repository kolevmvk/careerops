-- Demo seed: a fictional persona, never real career data.
-- ADR-0012 (public code, private data), SPECIFICATION §10.3.
--
-- Every name, company and link below is invented. The persona exists so a
-- reviewer can click through the system, and so the thin loop has something
-- to render before any real data is entered.
--
-- This file inserts into auth.users. The database CareerOps runs against also
-- hosts another project whose auth.users are real customers, so running this
-- there would put a fictional account among them.
--
-- The guard is emptiness, not hostname or port: both are identical between the
-- local container and a hosted project, so neither can tell them apart. A
-- database that already has accounts in it is not a place for a demo persona,
-- wherever it runs. `supabase db reset` wipes first, so the local stack always
-- passes; any database with real users refuses.
do $$
declare
  existing int;
begin
  select count(*) into existing
    from auth.users
   where id <> '00000000-0000-4000-8000-000000000001';

  if existing > 0 then
    raise exception
      'The demo seed refuses to run: auth.users already holds % account(s). '
      'This database belongs to something else and the seed writes real auth rows.',
      existing
      using errcode = 'insufficient_privilege';
  end if;
end;
$$;

set search_path = careerops, public, extensions;

-- The demo account must actually be able to sign in, because staging runs this
-- seed and doubles as the public demo (ENVIRONMENTS.md). Inserting only id and
-- email leaves GoTrue's token columns NULL, which it reads into non-nullable
-- strings and fails with "Database error loading user".
--
-- The password below is deliberately public: it opens a fictional persona on an
-- instance that holds no real data. Production never runs this seed.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change_token_current,
  email_change,
  phone_change,
  phone_change_token,
  reauthentication_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'demo@careerops.invalid',
  extensions.crypt('careerops-demo', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Dana Present"}'::jsonb,
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

-- Password sign-in needs a matching identity for the email provider.
insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '{"sub": "00000000-0000-4000-8000-000000000001", "email": "demo@careerops.invalid", "email_verified": true, "phone_verified": false}'::jsonb,
  'email',
  now(),
  now(),
  now()
)
on conflict (id) do nothing;

insert into profiles (user_id, full_name, headline, summary, location, timezone, public_slug)
values (
  '00000000-0000-4000-8000-000000000001',
  'Dana Present',
  'Cross-platform mobile and integration engineer',
  'Fictional demo persona. Builds mobile clients and the integration layer '
  'between field devices and back-office systems.',
  'Somewhereville',
  'Europe/Belgrade',
  'demo'
)
on conflict (user_id) do nothing;

insert into target_roles (
  id, user_id, name, tier, weight, seniority_band,
  comp_floor, comp_currency, comp_period, comp_basis, accepted_contract_types
)
values (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'Cross-Platform Mobile Engineer', 'primary', 1.0, 'mid-senior',
  3000, 'EUR', 'month', 'b2b_invoice', '{b2b_contract,employment}'
)
on conflict (id) do nothing;

insert into employments (
  id, user_id, organization, public_organization, title, employment_type,
  start_date, end_date, location, summary, visibility
)
values
  (
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000001',
    'Fictional Field Systems d.o.o.', 'Fictional Field Systems',
    'Mobile Engineer', 'full_time',
    '2024-03-01', null, 'Remote',
    'Built and shipped two cross-platform field applications.', 'cv_safe'
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000001',
    'Invented Networks', 'Invented Networks',
    'Systems Engineer', 'full_time',
    '2012-01-01', '2024-02-01', 'Somewhereville',
    'Linux, networking and operations for critical systems.', 'cv_safe'
  )
on conflict (id) do nothing;

insert into employment_highlights (
  id, user_id, employment_id, text, visibility, verified_at, sort_order
)
values
  (
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000201',
    'Shipped two production applications to both mobile app stores and owned '
    'the release process end to end.',
    'cv_safe', now(), 1
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000201',
    'Designed an offline capture queue with idempotent replay, so events '
    'survive process death and reconnect exactly once.',
    'cv_safe', now(), 2
  ),
  (
    '00000000-0000-4000-8000-000000000303',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000202',
    'Operated Linux and network infrastructure for systems with availability '
    'requirements measured in minutes per year.',
    'cv_safe', now(), 1
  )
on conflict (id) do nothing;

-- A product family: one parent, two children (DOMAIN §4.3).
insert into projects (
  id, user_id, name, slug, parent_project_id, employment_id, kind, role, ownership,
  problem, solution, operational_status, started_at,
  ip_owner, code_visibility, visibility, disclosure_status
)
values
  (
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000001',
    'Demo Field Platform', 'demo-field-platform', null,
    '00000000-0000-4000-8000-000000000201',
    'product', 'Mobile and integration lead', 'lead',
    'Field events captured on unreliable networks must reach back-office '
    'systems exactly once.',
    'A durable local queue with idempotent replay and a documented API boundary.',
    'production', '2024-04-01',
    'employer', 'employer_owned', 'cv_safe', 'approval_required'
  ),
  (
    '00000000-0000-4000-8000-000000000402',
    '00000000-0000-4000-8000-000000000001',
    'Demo Mobile Client', 'demo-mobile-client',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000201',
    'product', 'Mobile engineer', 'sole',
    'Personal device capture with location and code scanning.',
    'Cross-platform client with pluggable capture adapters.',
    'production', '2024-04-01',
    'employer', 'employer_owned', 'cv_safe', 'approval_required'
  ),
  (
    '00000000-0000-4000-8000-000000000403',
    '00000000-0000-4000-8000-000000000001',
    'Demo Shared Terminal', 'demo-shared-terminal',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000201',
    'product', 'Mobile engineer', 'sole',
    'A shared tablet used by many people in sequence.',
    'Device identity separated from person identity, with isolated sessions.',
    'production', '2024-09-01',
    'employer', 'employer_owned', 'cv_safe', 'approval_required'
  )
on conflict (id) do nothing;

-- One ad per intake lane, so the corpus view has something to group.
insert into jobs (
  id, user_id, target_role_id, company, title, location, remote_policy,
  source_kind, source_url, raw_text, content_hash, relevance, status, posted_at
)
values
  (
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000101',
    'Imaginary Logistics', 'Senior Mobile Engineer', 'Remote (EU)', 'remote',
    'ats_api', 'https://example.invalid/jobs/1',
    'We need offline-capable mobile clients for delivery drivers. '
    'Experience with local queues and conflict resolution required.',
    'demo-hash-001', 2, 'parsed', current_date - 3
  ),
  (
    '00000000-0000-4000-8000-000000000502',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000101',
    'Pretend Retail Systems', 'Mobile Integration Engineer', 'Remote', 'remote',
    'paste', null,
    'Integration between in-store devices and the back office. '
    'Device identity and audit trails matter to us.',
    'demo-hash-002', 1, 'new', current_date - 10
  )
on conflict (id) do nothing;

-- A pipeline entry with its document, frozen by the attach trigger (I3).
insert into documents (id, user_id, kind, title, target_role_id, job_id)
values (
  '00000000-0000-4000-8000-000000000601',
  '00000000-0000-4000-8000-000000000001',
  'cv', 'CV — Imaginary Logistics',
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000501'
)
on conflict (id) do nothing;

insert into document_versions (id, user_id, document_id, version, rendered_md, generator)
values (
  '00000000-0000-4000-8000-000000000701',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000601', 1,
  E'# Dana Present\n\nCross-platform mobile and integration engineer.\n',
  'template'
)
on conflict (id) do nothing;

insert into document_sources (user_id, document_version_id, section, employment_highlight_id)
values
  ('00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000701', 'experience',
   '00000000-0000-4000-8000-000000000301'),
  ('00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000701', 'experience',
   '00000000-0000-4000-8000-000000000302')
on conflict do nothing;

insert into opportunities (
  id, user_id, track, origin, job_id, target_role_id, project_id,
  title, angle, fit, stage, expected_comp, comp_currency, contract_type, remote_policy
)
values (
  '00000000-0000-4000-8000-000000000801',
  '00000000-0000-4000-8000-000000000001',
  'contract', 'job_ad',
  '00000000-0000-4000-8000-000000000501',
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000401',
  'Imaginary Logistics — Senior Mobile Engineer',
  'They describe the offline delivery problem this persona already shipped.',
  4, 'contacted', 3000, 'EUR', 'b2b_contract', 'remote'
)
on conflict (id) do nothing;

insert into opportunity_documents (user_id, opportunity_id, document_version_id, role)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000801',
  '00000000-0000-4000-8000-000000000701',
  'cv'
)
on conflict do nothing;
