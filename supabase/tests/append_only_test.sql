-- I10: audit_log and skill_assessments are append-only -- no update or
-- delete policy exists, so even the owning user cannot modify or remove a
-- row once written (docs/DOMAIN.md §6).
begin;
select plan(6);

select is(
  (
    select coalesce(array_agg(c.relname order by c.relname), array[]::name[])
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'careerops' and c.relkind = 'r'
      and not exists (
        select 1 from pg_policies p
        where p.schemaname = 'careerops' and p.tablename = c.relname and p.cmd = 'UPDATE'
      )
  ),
  array['audit_log', 'skill_assessments']::name[],
  'only audit_log and skill_assessments lack an update policy'
);

select is(
  (
    select coalesce(array_agg(c.relname order by c.relname), array[]::name[])
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'careerops' and c.relkind = 'r'
      and not exists (
        select 1 from pg_policies p
        where p.schemaname = 'careerops' and p.tablename = c.relname and p.cmd = 'DELETE'
      )
  ),
  array['audit_log', 'skill_assessments']::name[],
  'only audit_log and skill_assessments lack a delete policy'
);

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');

set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-1111-1111-111111111111';

insert into careerops.audit_log (user_id, entity, entity_id, action, actor)
values ('11111111-1111-1111-1111-111111111111', 'employments', gen_random_uuid(), 'update', 'user');

select is((select count(*)::int from careerops.audit_log), 1, 'owner can insert an audit_log row');

update careerops.audit_log set action = 'changed';
select is((select count(*)::int from careerops.audit_log where action = 'changed'), 0, 'owner cannot update an audit_log row');

delete from careerops.audit_log;
select is((select count(*)::int from careerops.audit_log), 1, 'owner cannot delete an audit_log row');

select isnt_empty(
  $$ select 1 from careerops.audit_log $$,
  'the audit_log row is still there after the failed update/delete'
);

select * from finish();
rollback;
