-- I2: a frozen document version cannot be updated or deleted.
-- I3: linking a document version to an opportunity freezes it.
-- (docs/DOMAIN.md §6, ADR-0005)
begin;
select plan(5);

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-1111-1111-111111111111';

insert into careerops.documents (user_id, kind, title)
values ('11111111-1111-1111-1111-111111111111', 'cv', 'Freeze Test CV');

insert into careerops.document_versions (user_id, document_id, version, rendered_md)
select '11111111-1111-1111-1111-111111111111', id, 1, 'draft content'
from careerops.documents where title = 'Freeze Test CV';

select is(
  (select status::text from careerops.document_versions where document_id = (select id from careerops.documents where title = 'Freeze Test CV')),
  'draft',
  'a new document version starts as draft'
);

insert into careerops.opportunities (user_id, track, origin, title)
values ('11111111-1111-1111-1111-111111111111', 'employment', 'outreach', 'Freeze Test Opportunity');

insert into careerops.opportunity_documents (user_id, opportunity_id, document_version_id, role)
select
  '11111111-1111-1111-1111-111111111111',
  (select id from careerops.opportunities where title = 'Freeze Test Opportunity'),
  (select id from careerops.document_versions where document_id = (select id from careerops.documents where title = 'Freeze Test CV')),
  'cv';

select is(
  (select status::text from careerops.document_versions where document_id = (select id from careerops.documents where title = 'Freeze Test CV')),
  'frozen',
  'linking a document version to an opportunity freezes it (I3)'
);

select isnt(
  (select frozen_at from careerops.document_versions where document_id = (select id from careerops.documents where title = 'Freeze Test CV')),
  null,
  'frozen_at is set once frozen'
);

select throws_ok(
  $$ update careerops.document_versions set rendered_md = 'changed'
     where document_id = (select id from careerops.documents where title = 'Freeze Test CV') $$,
  'P0001'::char(5), null,
  'a frozen document version rejects update (I2)'
);

select throws_ok(
  $$ delete from careerops.document_versions
     where document_id = (select id from careerops.documents where title = 'Freeze Test CV') $$,
  'P0001'::char(5), null,
  'a frozen document version rejects delete (I2)'
);

select * from finish();
rollback;
