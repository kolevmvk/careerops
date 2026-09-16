-- Translated facts: approval gates publication, and drift is caught.
-- SPECIFICATION §8, the i18n skill.

begin;

set search_path = careerops, public, extensions;
select plan(12);

create extension if not exists pgtap with schema extensions;

insert into auth.users (id, email, instance_id, aud, role)
values ('11111111-1111-1111-1111-111111111111', 'owner@example.test',
        '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

insert into profiles (user_id, full_name, public_slug)
values ('11111111-1111-1111-1111-111111111111', 'Owner Name', 'tx');

insert into projects
  (id, user_id, name, slug, kind, ip_owner, visibility, disclosure_status, problem)
values ('dddddddd-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111',
        'Sync Engine', 'sync-engine', 'lab', 'self', 'portfolio_public', 'not_required',
        'Events are lost on unreliable networks.');

-- The source hash is whitespace and case insensitive, so reformatting a fact
-- must not invalidate its translations while changing its meaning must.
select is(
  fact_source_hash('Events are lost.'),
  fact_source_hash('  events   ARE   lost.  '),
  'the hash ignores case and whitespace'
);
select isnt(
  fact_source_hash('Events are lost.'),
  fact_source_hash('Events are duplicated.'),
  'the hash notices a changed claim'
);

-- Nothing translated yet: every non-source locale falls back.
select is(
  (select body from public_facts
    where public_slug = 'tx' and locale = 'de'),
  'Events are lost on unreliable networks.',
  'German falls back to the English source'
);
select ok(
  (select is_fallback from public_facts where public_slug = 'tx' and locale = 'de'),
  'and is marked as a fallback'
);
select ok(
  not (select is_fallback from public_facts where public_slug = 'tx' and locale = 'en'),
  'the source locale is never a fallback'
);
select is(
  (select state from translation_status_report
    where fact_id = 'dddddddd-0000-0000-0000-000000000009' and locale = 'de'),
  'missing',
  'the report says the translation is missing'
);

-- A draft is not published.
insert into fact_translations
  (id, user_id, locale, project_id, title, body, status, source_hash)
values ('99999999-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'de', 'dddddddd-0000-0000-0000-000000000009', 'Sync-Engine',
        'Ereignisse gehen in unzuverlässigen Netzen verloren.', 'draft',
        fact_source_hash('Events are lost on unreliable networks.'));

select ok(
  (select is_fallback from public_facts where public_slug = 'tx' and locale = 'de'),
  'a draft translation does not reach the public surface'
);
select is(
  (select state from translation_status_report
    where fact_id = 'dddddddd-0000-0000-0000-000000000009' and locale = 'de'),
  'draft',
  'but the report shows it waiting'
);

-- Approving publishes it and stamps the time.
update fact_translations set status = 'approved'
 where id = '99999999-0000-0000-0000-000000000001';

select is(
  (select body from public_facts where public_slug = 'tx' and locale = 'de'),
  'Ereignisse gehen in unzuverlässigen Netzen verloren.',
  'an approved translation is what German readers get'
);
select isnt(
  (select approved_at from fact_translations
    where id = '99999999-0000-0000-0000-000000000001'),
  null,
  'approval is stamped'
);

-- The point of the whole design: the source changes, the translation does not
-- silently keep asserting the old claim.
update projects
   set problem = 'Events are duplicated on reconnect.'
 where id = 'dddddddd-0000-0000-0000-000000000009';

select is(
  (select body from public_facts where public_slug = 'tx' and locale = 'de'),
  'Events are duplicated on reconnect.',
  'a stale translation is dropped and the current source shown instead'
);
select is(
  (select state from translation_status_report
    where fact_id = 'dddddddd-0000-0000-0000-000000000009' and locale = 'de'),
  'stale',
  'and the report flags it for retranslation'
);

select * from finish();
rollback;
