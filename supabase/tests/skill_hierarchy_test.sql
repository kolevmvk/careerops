-- I9: skill hierarchy depth <= 2 and acyclic (docs/DOMAIN.md §6, ADR-0002).
begin;
select plan(5);

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-1111-1111-111111111111';

insert into public.skill_categories (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'Cloud');

insert into public.skills (user_id, name, slug, kind, category_id)
select '11111111-1111-1111-1111-111111111111', 'AWS', 'aws', 'platform', id
from public.skill_categories where name = 'Cloud';

insert into public.skills (user_id, name, slug, kind, category_id, parent_id)
select '11111111-1111-1111-1111-111111111111', 'IAM', 'iam', 'platform', id,
       (select id from public.skills where slug = 'aws')
from public.skill_categories where name = 'Cloud';

select is((select count(*)::int from public.skills where slug = 'iam'), 1, 'a child of a root skill is allowed');

select throws_like(
  $$ insert into public.skills (user_id, name, slug, kind, category_id, parent_id)
     select '11111111-1111-1111-1111-111111111111', 'IAM Policies', 'iam-policies', 'platform',
            (select id from public.skill_categories where name = 'Cloud'),
            (select id from public.skills where slug = 'iam') $$,
  '%depth cannot exceed 2%',
  'a grandchild (depth 3) is rejected'
);

insert into public.skills (user_id, name, slug, kind, category_id)
select '11111111-1111-1111-1111-111111111111', 'Other', 'other', 'platform', id
from public.skill_categories where name = 'Cloud';

select throws_like(
  $$ update public.skills set parent_id = (select id from public.skills where slug = 'other') where slug = 'aws' $$,
  '%already has children%',
  'a skill with existing children cannot become a child itself'
);

select throws_like(
  $$ update public.skills set parent_id = id where slug = 'other' $$,
  '%skills_not_own_parent%',
  'a skill cannot be its own parent'
);

select is(
  (select parent_id from public.skills where slug = 'other'),
  null,
  'the self-parent attempt did not change the row'
);

select * from finish();
rollback;
