-- Document freeze and source guardrails.
-- DOMAIN.md invariants I2, I3, I4, I5. SPECIFICATION §8.

begin;

set search_path = careerops, public, extensions;
select plan(11);

create extension if not exists pgtap with schema extensions;

insert into auth.users (id, email, instance_id, aud, role)
values ('11111111-1111-1111-1111-111111111111', 'owner@example.test',
        '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

insert into employments
  (id, user_id, organization, title, employment_type, start_date, visibility)
values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'Owner Co', 'Engineer', 'full_time', '2020-01-01', 'cv_safe');

-- One verified highlight and one unverified, to prove I5 bites.
insert into employment_highlights (id, user_id, employment_id, text, visibility, verified_at)
values
  ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-0000-0000-0000-000000000001', 'Verified claim', 'cv_safe', now()),
  ('cccccccc-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-0000-0000-0000-000000000001', 'Unverified claim', 'cv_safe', null);

insert into documents (id, user_id, kind, title)
values
  ('eeeeeeee-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'cv', 'CV for mobile roles'),
  ('eeeeeeee-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'case_study', 'Offline sync case study');

insert into document_versions (id, user_id, document_id, version)
values
  ('ffffffff-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'eeeeeeee-0000-0000-0000-000000000001', 1),
  ('ffffffff-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'eeeeeeee-0000-0000-0000-000000000002', 1);

select is(document_kind_visibility_minimum('cv'), 'cv_safe'::visibility,
  'a CV needs cv_safe facts');
select is(document_kind_visibility_minimum('linkedin_profile'), 'cv_safe'::visibility,
  'LinkedIn is cv_safe, not portfolio_public');
select is(document_kind_visibility_minimum('case_study'), 'portfolio_public'::visibility,
  'a case study needs portfolio_public facts');

-- I4: a cv_safe fact cannot appear in a case study.
select throws_ok(
  $$insert into document_sources (user_id, document_version_id, section, employment_id)
    values ('11111111-1111-1111-1111-111111111111',
            'ffffffff-0000-0000-0000-000000000002', 'experience',
            'aaaaaaaa-0000-0000-0000-000000000001')$$,
  '23514',
  null,
  'a cv_safe employment cannot be cited by a case study'
);

-- I5: unverified claims are not facts.
select throws_ok(
  $$insert into document_sources
      (user_id, document_version_id, section, employment_highlight_id)
    values ('11111111-1111-1111-1111-111111111111',
            'ffffffff-0000-0000-0000-000000000001', 'experience',
            'cccccccc-0000-0000-0000-000000000002')$$,
  '23514',
  null,
  'an unverified highlight cannot be a document source'
);

-- Exactly one fact per source row.
select throws_ok(
  $$insert into document_sources
      (user_id, document_version_id, section, employment_id, employment_highlight_id)
    values ('11111111-1111-1111-1111-111111111111',
            'ffffffff-0000-0000-0000-000000000001', 'experience',
            'aaaaaaaa-0000-0000-0000-000000000001',
            'cccccccc-0000-0000-0000-000000000001')$$,
  '23514',
  null,
  'a source row cannot reference two facts at once'
);

-- The allowed path works.
insert into document_sources (user_id, document_version_id, section, employment_highlight_id)
values ('11111111-1111-1111-1111-111111111111',
        'ffffffff-0000-0000-0000-000000000001', 'experience',
        'cccccccc-0000-0000-0000-000000000001');
select pass('a verified cv_safe highlight can be cited by a CV');

-- I3: attaching to an opportunity freezes the version.
insert into opportunities (id, user_id, origin, title)
values ('99999999-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'job_ad', 'Acme — Flutter Engineer');

insert into opportunity_documents (user_id, opportunity_id, document_version_id, role)
values ('11111111-1111-1111-1111-111111111111',
        '99999999-0000-0000-0000-000000000001',
        'ffffffff-0000-0000-0000-000000000001', 'cv');

select is(
  (select status from document_versions where id = 'ffffffff-0000-0000-0000-000000000001'),
  'frozen'::document_status,
  'attaching a version to an opportunity freezes it'
);
select isnt(
  (select frozen_at from document_versions where id = 'ffffffff-0000-0000-0000-000000000001'),
  null,
  'freezing stamps frozen_at'
);

-- I2: frozen is final.
select throws_ok(
  $$update document_versions set rendered_md = 'edited'
     where id = 'ffffffff-0000-0000-0000-000000000001'$$,
  '23514',
  null,
  'a frozen version cannot be updated'
);
select throws_ok(
  $$delete from document_versions where id = 'ffffffff-0000-0000-0000-000000000001'$$,
  '23514',
  null,
  'a frozen version cannot be deleted'
);

select * from finish();
rollback;
