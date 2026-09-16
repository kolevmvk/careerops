-- Visibility ceilings and disclosure rules.
-- DOMAIN.md §5.2 and invariant I1.

begin;
select plan(12);

create extension if not exists pgtap with schema extensions;

insert into auth.users (id, email, instance_id, aud, role)
values ('11111111-1111-1111-1111-111111111111', 'owner@example.test',
        '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

-- The ceiling function is the single definition everything else leans on.
select is(disclosure_ceiling('not_required'), 'portfolio_public'::visibility,
  'not_required allows portfolio_public');
select is(disclosure_ceiling('approved'), 'portfolio_public'::visibility,
  'approved allows portfolio_public');
select is(disclosure_ceiling('approval_required'), 'cv_safe'::visibility,
  'approval_required caps at cv_safe');
select is(disclosure_ceiling('restricted'), 'cv_safe'::visibility,
  'restricted caps at cv_safe');

-- Ordering is what makes least() and the comparisons meaningful.
select ok('private'::visibility < 'cv_safe'::visibility, 'private sorts below cv_safe');
select ok('cv_safe'::visibility < 'portfolio_public'::visibility,
  'cv_safe sorts below portfolio_public');

select throws_ok(
  $$insert into employments
      (user_id, organization, title, employment_type, start_date, visibility, disclosure_status)
    values ('11111111-1111-1111-1111-111111111111', 'Restricted Co', 'Engineer',
            'full_time', '2020-01-01', 'portfolio_public', 'approval_required')$$,
  '23514',
  null,
  'an employment cannot exceed its approval_required ceiling'
);

select throws_ok(
  $$insert into employments
      (user_id, organization, title, employment_type, start_date,
       visibility, disclosure_status, ai_allowed)
    values ('11111111-1111-1111-1111-111111111111', 'Restricted Co', 'Engineer',
            'full_time', '2020-01-01', 'cv_safe', 'restricted', true)$$,
  '23514',
  null,
  'restricted rows cannot set ai_allowed'
);

insert into employments
  (id, user_id, organization, title, employment_type, start_date, visibility, disclosure_status)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Owner Co', 'Engineer', 'full_time', '2020-01-01', 'cv_safe', 'not_required');

select throws_ok(
  $$insert into employment_highlights (user_id, employment_id, text, visibility)
    values ('11111111-1111-1111-1111-111111111111',
            'aaaaaaaa-0000-0000-0000-000000000001',
            'Shipped two production apps', 'portfolio_public')$$,
  '23514',
  null,
  'a highlight cannot travel further than its employment'
);

insert into employment_highlights (id, user_id, employment_id, text, visibility)
values ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-0000-0000-0000-000000000001', 'Shipped two production apps', 'cv_safe');

-- Lowering the parent must drag its children down, not strand them.
update employments
   set visibility = 'private'
 where id = 'aaaaaaaa-0000-0000-0000-000000000001';

select is(
  (select visibility from employment_highlights
    where id = 'cccccccc-0000-0000-0000-000000000001'),
  'private'::visibility,
  'lowering an employment reclamps its highlights'
);

-- Third-party IP is forced to approval_required, which then caps visibility.
insert into projects (id, user_id, name, slug, kind, ip_owner, disclosure_status)
values ('dddddddd-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'Employer Product', 'employer-product', 'product', 'employer', 'not_required');

select is(
  (select disclosure_status from projects
    where id = 'dddddddd-0000-0000-0000-000000000001'),
  'approval_required'::disclosure_status,
  'employer-owned IP is forced to approval_required'
);

select throws_ok(
  $$insert into projects (user_id, name, slug, kind, ip_owner, visibility)
    values ('11111111-1111-1111-1111-111111111111', 'Client Work', 'client-work',
            'client_work', 'client', 'portfolio_public')$$,
  '23514',
  null,
  'client-owned work cannot be published without approval'
);

select * from finish();
rollback;
