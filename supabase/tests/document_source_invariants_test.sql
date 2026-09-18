-- I4: document_sources requires a verified fact at or above the document
-- kind's visibility minimum.
-- I12: a project_benchmark source additionally needs verified own_evidence
-- and a checked_at within 180 days.
-- (docs/DOMAIN.md §6, ADR-0005, ADR-0009)
begin;
select plan(6);

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-1111-1111-111111111111';

insert into careerops.documents (user_id, kind, title)
values ('11111111-1111-1111-1111-111111111111', 'cv', 'Source Test CV');
insert into careerops.document_versions (user_id, document_id, version)
select '11111111-1111-1111-1111-111111111111', id, 1 from careerops.documents where title = 'Source Test CV';

insert into careerops.projects (user_id, name, slug, kind, ownership, started_at, ip_owner, code_visibility, visibility)
values ('11111111-1111-1111-1111-111111111111', 'Tempus', 'tempus', 'product', 'lead', '2022-01-01', 'unclear', 'employer_owned', 'private');

-- I4: a private project is below the cv_safe minimum for a cv document.
select throws_like(
  $$ insert into careerops.document_sources (user_id, document_version_id, section, project_id)
     select '11111111-1111-1111-1111-111111111111',
            (select id from careerops.document_versions where document_id = (select id from careerops.documents where title = 'Source Test CV')),
            'summary', id
     from careerops.projects where slug = 'tempus' $$,
  '%below the cv_safe minimum%',
  'a private project is rejected as a cv-kind source (I4)'
);

update careerops.projects set visibility = 'cv_safe' where slug = 'tempus';
insert into careerops.document_sources (user_id, document_version_id, section, project_id)
select '11111111-1111-1111-1111-111111111111',
       (select id from careerops.document_versions where document_id = (select id from careerops.documents where title = 'Source Test CV')),
       'summary', id
from careerops.projects where slug = 'tempus';

select is((select count(*)::int from careerops.document_sources), 1, 'a cv_safe project is accepted as a source once raised');

-- I4: unverified evidence is rejected regardless of visibility.
insert into careerops.evidence (user_id, type, title, project_id, occurred_from, visibility)
select '11111111-1111-1111-1111-111111111111', 'release', 'Release', id, '2023-01-01', 'cv_safe'
from careerops.projects where slug = 'tempus';

select throws_like(
  $$ insert into careerops.document_sources (user_id, document_version_id, section, evidence_id)
     select '11111111-1111-1111-1111-111111111111',
            (select id from careerops.document_versions where document_id = (select id from careerops.documents where title = 'Source Test CV')),
            'impact', id
     from careerops.evidence where title = 'Release' $$,
  '%unverified fact%',
  'unverified evidence is rejected as a source (I4)'
);

update careerops.evidence set verified_at = now() where title = 'Release';
insert into careerops.document_sources (user_id, document_version_id, section, evidence_id)
select '11111111-1111-1111-1111-111111111111',
       (select id from careerops.document_versions where document_id = (select id from careerops.documents where title = 'Source Test CV')),
       'impact', id
from careerops.evidence where title = 'Release';

select is((select count(*)::int from careerops.document_sources), 2, 'verified evidence is accepted as a source');

-- I12: a project_benchmark with verified evidence but no recent checked_at is rejected.
insert into careerops.project_benchmarks (user_id, project_id, capability, own_status, own_evidence_id, visibility)
select '11111111-1111-1111-1111-111111111111', id, 'offline sync', 'implemented',
       (select id from careerops.evidence where title = 'Release'), 'cv_safe'
from careerops.projects where slug = 'tempus';

select throws_like(
  $$ insert into careerops.document_sources (user_id, document_version_id, section, project_benchmark_id)
     select '11111111-1111-1111-1111-111111111111',
            (select id from careerops.document_versions where document_id = (select id from careerops.documents where title = 'Source Test CV')),
            'benchmarks', id
     from careerops.project_benchmarks where capability = 'offline sync' $$,
  '%checked_at must be within 180 days%',
  'a project_benchmark with no checked_at is rejected as a source (I12)'
);

update careerops.project_benchmarks set checked_at = current_date - 10 where capability = 'offline sync';
insert into careerops.document_sources (user_id, document_version_id, section, project_benchmark_id)
select '11111111-1111-1111-1111-111111111111',
       (select id from careerops.document_versions where document_id = (select id from careerops.documents where title = 'Source Test CV')),
       'benchmarks', id
from careerops.project_benchmarks where capability = 'offline sync';

select is((select count(*)::int from careerops.document_sources), 3, 'a recently checked project_benchmark is accepted as a source');

select * from finish();
rollback;
