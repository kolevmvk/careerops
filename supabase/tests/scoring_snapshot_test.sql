-- I8: snapshots always carry scoring_version and scoring_config_id; exactly
-- one row per subject has is_current = true. scoring_configs has an
-- analogous "exactly one active" rule. (docs/DOMAIN.md §6, ADR-0003)
begin;
select plan(4);

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-1111-1111-111111111111';

insert into public.scoring_configs (user_id, version, is_active) values
  ('11111111-1111-1111-1111-111111111111', 'v1', true),
  ('11111111-1111-1111-1111-111111111111', 'v2', false);

select throws_ok(
  $$ update public.scoring_configs set is_active = true where version = 'v2' $$,
  '23505'::char(5), null,
  'a second active scoring_config for the same user is rejected'
);

insert into public.skill_categories (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'Cloud');
insert into public.skills (user_id, name, slug, kind, category_id)
select '11111111-1111-1111-1111-111111111111', 'AWS', 'aws', 'platform', id from public.skill_categories where name = 'Cloud';
insert into public.user_skills (user_id, skill_id)
select '11111111-1111-1111-1111-111111111111', id from public.skills where slug = 'aws';

insert into public.skill_scores (user_id, user_skill_id, target_role_id, scoring_version, scoring_config_id, is_current)
select '11111111-1111-1111-1111-111111111111', us.id, null, 'v1', sc.id, true
from public.user_skills us, public.scoring_configs sc
where sc.version = 'v1';

select throws_ok(
  $$ insert into public.skill_scores (user_id, user_skill_id, target_role_id, scoring_version, scoring_config_id, is_current)
     select '11111111-1111-1111-1111-111111111111', us.id, null, 'v1', sc.id, true
     from public.user_skills us, public.scoring_configs sc
     where sc.version = 'v1' $$,
  '23505'::char(5), null,
  'a second is_current skill_scores row for the same (user_skill_id, null target_role_id) is rejected'
);

update public.skill_scores set is_current = false;
insert into public.skill_scores (user_id, user_skill_id, target_role_id, scoring_version, scoring_config_id, is_current)
select '11111111-1111-1111-1111-111111111111', us.id, null, 'v2', sc.id, true
from public.user_skills us, public.scoring_configs sc
where sc.version = 'v2';

select is(
  (select count(*)::int from public.skill_scores where is_current),
  1,
  'exactly one is_current skill_scores row exists after superseding the old one'
);

select is(
  (select scoring_version from public.skill_scores where is_current),
  'v2',
  'the current skill_scores row is the newly computed one'
);

select * from finish();
rollback;
