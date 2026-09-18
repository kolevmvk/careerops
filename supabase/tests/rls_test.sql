-- RLS: enabled everywhere, select/insert policies everywhere, cross-user
-- isolation and anon denial on a representative table (docs/DOMAIN.md §6,
-- ADR-0007). I10 (append-only tables) is covered separately in
-- append_only_test.sql.
begin;
select plan(8);

select is(
  (
    select count(*)::int from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  ),
  0,
  'every table in public has row level security enabled'
);

select is(
  (
    select count(*)::int from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not exists (
        select 1 from pg_policies p
        where p.schemaname = 'public' and p.tablename = c.relname and p.cmd = 'SELECT'
      )
  ),
  0,
  'every table has a select policy'
);

select is(
  (
    select count(*)::int from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not exists (
        select 1 from pg_policies p
        where p.schemaname = 'public' and p.tablename = c.relname and p.cmd = 'INSERT'
      )
  ),
  0,
  'every table has an insert policy'
);

-- Cross-user isolation and anon denial, exercised on skill_categories.
insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-1111-1111-111111111111';
insert into public.skill_categories (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'Cloud');

set local "request.jwt.claim.sub" to '22222222-2222-2222-2222-222222222222';
select is(
  (select count(*)::int from public.skill_categories),
  0,
  'user 2 cannot see user 1''s row'
);

insert into public.skill_categories (user_id, name) values ('22222222-2222-2222-2222-222222222222', 'Networking');
select is(
  (select count(*)::int from public.skill_categories),
  1,
  'user 2 sees only their own row, not user 1''s'
);

set local "request.jwt.claim.sub" to '11111111-1111-1111-1111-111111111111';
select is(
  (select count(*)::int from public.skill_categories),
  1,
  'user 1 sees only their own row, not user 2''s'
);

set local role anon;
set local "request.jwt.claim.sub" to '';
select is(
  (select count(*)::int from public.skill_categories),
  0,
  'anon (no auth.uid()) sees no rows'
);

select is(
  (select count(*)::int from public.skill_categories where user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'anon cannot target a specific user''s row by id either'
);

select * from finish();
rollback;
