-- The public surface is the one deliberate opening in the schema.
-- SPECIFICATION §13.2, ADR-0016.

begin;

set search_path = careerops, public, extensions;
select plan(14);

create extension if not exists pgtap with schema extensions;

insert into auth.users (id, email, instance_id, aud, role)
values ('11111111-1111-1111-1111-111111111111', 'owner@example.test',
        '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

insert into profiles (user_id, full_name, headline, public_slug)
values ('11111111-1111-1111-1111-111111111111', 'Owner Name', 'Engineer', 'owner');

-- One of each: published, cv_safe only, and employer-owned but marked public.
-- ip_owner matters here: it defaults to `unclear`, which the trigger raises to
-- approval_required and the ceiling then caps at cv_safe. A project cannot be
-- published until its owner claims it, which is the rule working as intended.
insert into projects
  (id, user_id, name, slug, kind, ip_owner, visibility, disclosure_status, problem)
values
  ('dddddddd-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Published Project', 'published', 'product', 'self', 'portfolio_public', 'not_required',
   'A problem stated in public.'),
  ('dddddddd-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'CV Only Project', 'cv-only', 'product', 'self', 'cv_safe', 'not_required',
   'Never shown in public.'),
  ('dddddddd-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'Employer Project', 'employer', 'product', 'employer', 'cv_safe', 'approved',
   'Approved but only cv_safe.');

-- And the rule itself, asserted rather than only relied upon.
select throws_ok(
  $$insert into projects (user_id, name, slug, kind, visibility)
    values ('11111111-1111-1111-1111-111111111111', 'Unclaimed', 'unclaimed',
            'product', 'portfolio_public')$$,
  '23514',
  null,
  'a project of unclear ownership cannot be published'
);

insert into employments
  (id, user_id, organization, public_title, title, employment_type, start_date,
   visibility, disclosure_status)
values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'Owner Co', 'Engineer', 'Engineer', 'full_time', '2020-01-01',
        'portfolio_public', 'not_required');

insert into employment_highlights (id, user_id, employment_id, text, visibility, verified_at)
values
  ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-0000-0000-0000-000000000001', 'Verified and published.',
   'portfolio_public', now()),
  ('cccccccc-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-0000-0000-0000-000000000001', 'Published but never verified.',
   'portfolio_public', null);

-- What the owner sees through the view.
-- Every assertion is scoped to this fixture's slug: the demo seed also
-- publishes facts, and a test that assumes an empty database is a test that
-- breaks the moment the seed grows.
select is(
  (select count(*) from public_facts where kind = 'project' and public_slug = 'owner')::int, 1,
  'only the portfolio_public project appears'
);
select is(
  (select title from public_facts where kind = 'project' and public_slug = 'owner'),
  'Published Project',
  'and it is the right one'
);
select is(
  (select count(*) from public_facts where kind = 'highlight' and public_slug = 'owner')::int, 1,
  'only the verified published highlight appears'
);
select is(
  (select body from public_facts where kind = 'highlight' and public_slug = 'owner'),
  'Verified and published.',
  'the unverified one is absent (DOMAIN I5)'
);

select is_empty(
  $$select 1 from public_facts where body like '%Never shown%'$$,
  'a cv_safe project never reaches the public view'
);
select is_empty(
  $$select 1 from public_facts where body like '%Approved but only cv_safe%'$$,
  'an approved disclosure does not raise a cv_safe row to public'
);

-- Anonymous callers: the view and nothing else.
set local role anon;

select lives_ok(
  'select 1 from public_facts',
  'anon can read the public view'
);
select lives_ok(
  'select 1 from public_profiles',
  'anon can read the public profile view'
);
select results_eq(
  $$select count(*)::int from public_facts where public_slug = 'owner'$$,
  array[2],
  'anon sees exactly the two published facts for this profile'
);

select throws_ok('select 1 from projects', '42501', null, 'anon still cannot read projects');
select throws_ok('select 1 from profiles', '42501', null, 'anon still cannot read profiles');
select throws_ok(
  'select 1 from employment_highlights', '42501', null,
  'anon still cannot read highlights'
);
select throws_ok(
  'select 1 from opportunities', '42501', null,
  'anon still cannot read the pipeline'
);

reset role;

select * from finish();
rollback;
