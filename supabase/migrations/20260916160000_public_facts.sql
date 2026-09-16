-- The only thing an unauthenticated caller may ever read (SPECIFICATION §13.2).
--
-- Everything else in this schema is unreachable by `anon`: it holds `usage` on
-- careerops and no table privileges at all (ADR-0016). This view is the single
-- deliberate opening, which is why its WHERE clause carries the whole weight.
--
-- Views run with the owner's privileges unless `security_invoker` is set, so
-- row level security on the base tables does NOT apply here. That is intended —
-- anon has no way to reach those tables — but it means the filter below is the
-- only thing standing between a private row and the open internet. Read it as
-- security policy, not as a query.

set search_path = careerops, public;

create view public_facts
with (security_invoker = false)
as
select
  p.public_slug,
  'project'::text as kind,
  pr.id,
  pr.name as title,
  pr.slug,
  concat_ws('. ', pr.problem, pr.solution, pr.result) as body,
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
  'highlight'::text as kind,
  h.id,
  e.public_title as title,
  null as slug,
  h.text as body,
  null as repo_url,
  null as live_url,
  e.start_date as happened_at
from employment_highlights h
join employments e on e.id = h.employment_id
join profiles p on p.user_id = h.user_id
where h.visibility = 'portfolio_public'
  and e.visibility = 'portfolio_public'
  and disclosure_ceiling(e.disclosure_status) = 'portfolio_public'
  -- I5: an unverified claim is not a fact, least of all in public.
  and h.verified_at is not null
  and p.public_slug is not null;

comment on view public_facts is
  'SPECIFICATION §13.2. portfolio_public facts only. The sole object in this '
  'schema that anon may select from; the WHERE clause is the access control.';

-- The public profile header. Separate from public_facts so the portfolio can
-- render a page for a person with no published facts yet.
create view public_profiles
with (security_invoker = false)
as
select
  p.public_slug,
  p.full_name,
  p.headline,
  p.summary,
  p.location
from profiles p
where p.public_slug is not null;

comment on view public_profiles is
  'SPECIFICATION §13.2. Only fields the owner chose to publish by setting a slug.';

grant select on public_facts to anon, authenticated;
grant select on public_profiles to anon, authenticated;
