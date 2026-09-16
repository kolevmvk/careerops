-- Make the public surface locale-aware.
--
-- Each published fact appears once per supported locale, already resolved: an
-- approved translation whose source has not moved, otherwise the English
-- source. Resolution lives here rather than in the client so that every
-- consumer - the portfolio, llms.txt, JSON-LD, any future agent surface -
-- resolves it the same way.
--
-- A stale translation is treated as absent. Showing an English sentence that is
-- true beats showing a German one that no longer is.

set search_path = careerops, public;

-- Joins fact fields into prose. `concat_ws('. ', ...)` doubles the separator
-- whenever a field already ends in punctuation, which it usually does, and the
-- result is visible on the public portfolio.
create function join_sentences(variadic parts text[]) returns text
language sql
immutable
parallel safe
as $$
  select nullif(
    trim(
      string_agg(
        case
          when right(trim(part), 1) in ('.', '!', '?', ':') then trim(part)
          else trim(part) || '.'
        end,
        ' '
      )
    ),
    ''
  )
  from unnest(parts) as part
  where part is not null and trim(part) <> '';
$$;

comment on function join_sentences(text[]) is
  'Sentence-aware join: adds terminal punctuation only where it is missing.';

drop view if exists public_facts;

-- The published set, once. Not granted to anon: it is the input to the two
-- views below, and the WHERE clauses here are the access control for both.
create view published_facts
with (security_invoker = false)
as
select
  p.public_slug,
  'project'::text as kind,
  pr.id as fact_id,
  pr.id as project_id,
  null::uuid as highlight_id,
  pr.name as source_title,
  pr.slug,
  join_sentences(pr.problem, pr.solution, pr.result) as source_body,
  pr.repo_url,
  pr.live_url,
  pr.started_at as happened_at
from projects pr
join profiles p on p.user_id = pr.user_id
where pr.visibility = 'portfolio_public'
  and disclosure_ceiling(pr.disclosure_status) = 'portfolio_public'
  and p.public_slug is not null

union all

select
  p.public_slug,
  'highlight'::text,
  h.id,
  null::uuid,
  h.id,
  e.public_title,
  null,
  h.text,
  null,
  null,
  e.start_date
from employment_highlights h
join employments e on e.id = h.employment_id
join profiles p on p.user_id = h.user_id
where h.visibility = 'portfolio_public'
  and e.visibility = 'portfolio_public'
  and disclosure_ceiling(e.disclosure_status) = 'portfolio_public'
  and h.verified_at is not null
  and p.public_slug is not null;

comment on view published_facts is
  'Source facts cleared for publication. Input to public_facts and the '
  'translation report; never granted to anon directly.';

create view public_facts
with (security_invoker = false)
as
select
  f.public_slug,
  l.code as locale,
  f.kind,
  f.fact_id as id,
  coalesce(t.title, f.source_title) as title,
  f.slug,
  coalesce(t.body, f.source_body) as body,
  f.repo_url,
  f.live_url,
  f.happened_at,
  -- True when the reader sees the source because no usable translation exists.
  (t.id is null and not l.is_source) as is_fallback
from published_facts f
cross join locales l
left join fact_translations t
  on t.locale = l.code
 and t.status = 'approved'
 and (
       (f.project_id is not null and t.project_id = f.project_id)
       or (f.highlight_id is not null and t.employment_highlight_id = f.highlight_id)
     )
 -- The drift check: a translation whose source has changed is not used.
 and t.source_hash = fact_source_hash(f.source_body);

comment on view public_facts is
  'SPECIFICATION §13.2. One row per published fact per locale, resolved to an '
  'approved and current translation or to the English source.';

-- What the cockpit needs: what is missing, what drifted, what is waiting.
create view translation_status_report
with (security_invoker = false)
as
select
  f.public_slug,
  l.code as locale,
  f.kind,
  f.fact_id,
  f.source_title as title,
  f.source_body,
  t.id as translation_id,
  t.body as translated_body,
  case
    when t.id is null then 'missing'
    when t.source_hash <> fact_source_hash(f.source_body) then 'stale'
    else t.status::text
  end as state
from published_facts f
cross join locales l
left join fact_translations t
  on t.locale = l.code
 and (
       (f.project_id is not null and t.project_id = f.project_id)
       or (f.highlight_id is not null and t.employment_highlight_id = f.highlight_id)
     )
where not l.is_source;

comment on view translation_status_report is
  'Cockpit view: missing, stale, draft or approved, per fact per locale.';

grant select on public_facts to anon, authenticated;
grant select on translation_status_report to authenticated;
