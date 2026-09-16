-- RLS isolation: another user and anon see nothing.
-- DOMAIN.md §6 (I10 shape), SPECIFICATION §16 item 1.

begin;

set search_path = careerops, public, extensions;
select plan(14);

create extension if not exists pgtap with schema extensions;

-- Two users, so "my rows only" is testable rather than assumed.
insert into auth.users (id, email, instance_id, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

insert into employments (id, user_id, organization, title, employment_type, start_date)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Owner Co', 'Engineer', 'full_time', '2020-01-01'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   'Other Co', 'Engineer', 'full_time', '2020-01-01');

insert into jobs (id, user_id, company, title, raw_text, content_hash)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Acme', 'Flutter Engineer', 'full ad text', 'hash-owner'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   'Other', 'Flutter Engineer', 'full ad text', 'hash-other');

select ok(
  (select count(*) from pg_tables
    where schemaname = 'careerops' and rowsecurity = false) = 0,
  'every careerops table has row level security enabled'
);

-- Anonymous callers. The careerops schema grants anon `usage` and nothing
-- else (ADR-0016), so an unauthenticated caller is refused at the privilege
-- layer and never reaches a row level security policy at all. That is stronger
-- than returning an empty set, and it is what these assert.
set local role anon;
select throws_ok('select 1 from employments', '42501', null, 'anon cannot read employments');
select throws_ok('select 1 from jobs', '42501', null, 'anon cannot read jobs');
select throws_ok('select 1 from projects', '42501', null, 'anon cannot read projects');
select throws_ok('select 1 from documents', '42501', null, 'anon cannot read documents');
select throws_ok('select 1 from opportunities', '42501', null, 'anon cannot read opportunities');
reset role;

-- The owner.
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111"}';

select results_eq(
  'select organization from employments',
  array['Owner Co'],
  'owner sees only their own employment'
);
select results_eq(
  'select company from jobs',
  array['Acme'],
  'owner sees only their own job ad'
);

-- Writing as someone else must fail even with a valid session.
select throws_ok(
  $$insert into employments (user_id, organization, title, employment_type, start_date)
    values ('22222222-2222-2222-2222-222222222222', 'Injected', 'X', 'full_time', '2020-01-01')$$,
  '42501',
  null,
  'owner cannot insert a row owned by another user'
);
select is_empty(
  $$update employments set title = 'Hijacked'
     where id = 'aaaaaaaa-0000-0000-0000-000000000002' returning 1$$,
  'owner cannot update another user''s employment'
);
select is_empty(
  $$delete from employments
     where id = 'aaaaaaaa-0000-0000-0000-000000000002' returning 1$$,
  'owner cannot delete another user''s employment'
);
reset role;

-- The other user.
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222"}';
select results_eq(
  'select organization from employments',
  array['Other Co'],
  'the second user sees only their own employment'
);
reset role;

-- Opportunity events are append-only: no update or delete policy exists.
select is_empty(
  $$select 1 from pg_policies
     where tablename = 'opportunity_events' and cmd in ('UPDATE', 'DELETE')$$,
  'opportunity_events has no update or delete policy'
);
select ok(
  (select count(*) from pg_policies where tablename = 'opportunity_events') = 2,
  'opportunity_events exposes exactly select and insert'
);

select * from finish();
rollback;
