-- I7: a roadmap item with requires_evidence cannot become done without at
-- least one verified linked evidence row (docs/DOMAIN.md §6).
begin;
select plan(3);

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-1111-1111-111111111111';

insert into careerops.roadmap_items (user_id, title, horizon, requires_evidence)
values ('11111111-1111-1111-1111-111111111111', 'Ship X', 'd90', true);

select throws_like(
  $$ update careerops.roadmap_items set status = 'done' where title = 'Ship X' $$,
  '%requires at least one verified evidence row%',
  'a roadmap item cannot become done without any linked evidence (I7)'
);

insert into careerops.evidence (user_id, type, title, occurred_from)
values ('11111111-1111-1111-1111-111111111111', 'documentation', 'Design doc', '2024-01-01');

insert into careerops.roadmap_item_evidence (user_id, roadmap_item_id, evidence_id)
select '11111111-1111-1111-1111-111111111111', (select id from careerops.roadmap_items where title = 'Ship X'), id
from careerops.evidence where title = 'Design doc';

select throws_like(
  $$ update careerops.roadmap_items set status = 'done' where title = 'Ship X' $$,
  '%requires at least one verified evidence row%',
  'a roadmap item cannot become done with only unverified evidence linked (I7)'
);

update careerops.evidence set verified_at = now() where title = 'Design doc';
update careerops.roadmap_items set status = 'done' where title = 'Ship X';

select is(
  (select status::text from careerops.roadmap_items where title = 'Ship X'),
  'done',
  'a roadmap item becomes done once verified evidence is linked'
);

select * from finish();
rollback;
