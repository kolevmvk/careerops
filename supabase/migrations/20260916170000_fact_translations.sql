-- Translated career facts.
--
-- A translated fact is still a claim about someone's work, not an interface
-- string, so it carries the same obligations as the English source: a machine
-- may draft it, only a person may publish it, and it never says something the
-- source does not.
--
-- The hard part is not translation, it is drift. If the English fact changes
-- after a translation is approved, the translation keeps asserting the old
-- claim in another language and nobody notices. Each row therefore records the
-- hash of the source it was translated from, and a translation whose source has
-- moved is treated as absent rather than shown.

set search_path = careerops, public;

create table locales (
  code text primary key,
  name text not null,
  is_source boolean not null default false,
  sort_order int not null default 0
);

comment on table locales is
  'Supported locales as data. Adding one is a content task, not a deployment.';

insert into locales (code, name, is_source, sort_order) values
  ('en', 'English', true, 1),
  ('de', 'Deutsch', false, 2),
  ('sr', 'Srpski', false, 3);

-- Exactly one source locale, enforced rather than assumed.
create unique index locales_single_source on locales (is_source) where is_source;

create type translation_status as enum ('draft', 'approved', 'rejected');

create table fact_translations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  locale text not null references locales (code),

  -- The same "exactly one subject" shape document_sources uses.
  project_id uuid references projects on delete cascade,
  employment_highlight_id uuid references employment_highlights on delete cascade,

  title text,
  body text not null,

  status translation_status not null default 'draft',
  generator document_generator not null default 'ai_assisted',
  approved_at timestamptz,

  -- What the source said when this was written. Compared on read.
  source_hash text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz,

  constraint fact_translations_exactly_one_subject check (
    num_nonnulls(project_id, employment_highlight_id) = 1
  ),
  constraint fact_translations_approved_has_timestamp
    check ((status = 'approved') = (approved_at is not null)),
  constraint fact_translations_project_unique unique (project_id, locale),
  constraint fact_translations_highlight_unique unique (employment_highlight_id, locale)
);

create index fact_translations_locale_idx on fact_translations (locale, status);

create trigger fact_translations_set_updated_at
  before update on fact_translations
  for each row execute function set_updated_at();

-- Canonical hash of a fact's source text, used on both write and read.
create function fact_source_hash(source_text text) returns text
language sql
immutable
parallel safe
as $$
  select encode(
    extensions.digest(
      trim(regexp_replace(lower(coalesce(source_text, '')), '\s+', ' ', 'g')),
      'sha256'
    ),
    'hex'
  );
$$;

comment on function fact_source_hash(text) is
  'Whitespace and case insensitive, so reformatting a fact does not invalidate '
  'its translations but changing what it says does.';

-- A translation cannot be approved into a locale that does not exist, and
-- approving it stamps the time.
create function stamp_translation_approval() returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved' and new.approved_at is null then
    new.approved_at := now();
  end if;

  if new.status <> 'approved' then
    new.approved_at := null;
  end if;

  return new;
end;
$$;

create trigger fact_translations_stamp_approval
  before insert or update on fact_translations
  for each row execute function stamp_translation_approval();

alter table locales enable row level security;
alter table fact_translations enable row level security;

-- Locales are reference data: readable by anyone, writable by nobody through
-- the API. Adding one is a migration.
create policy locales_readable on locales
  for select to anon, authenticated
  using (true);

create policy fact_translations_owner on fact_translations
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select on locales to anon, authenticated;
grant select, insert, update, delete on fact_translations to authenticated;
