-- I1: effective visibility never exceeds the disclosure ceiling or the
-- parent's effective visibility (docs/DOMAIN.md §5.2, §6, ADR-0004).
--
-- Looks rows up by their distinguishing literal values instead of capturing
-- generated ids into client variables, since pgTAP test files run through
-- more than one client (psql locally, a driver-based runner in CI) and
-- psql meta-commands such as \gset are not portable across them.
begin;
select plan(4);

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
set local role authenticated;
set local "request.jwt.claim.sub" to '11111111-1111-1111-1111-111111111111';

-- A restricted employment clamps its own visibility and forces ai_allowed = false.
insert into careerops.employments (user_id, organization, title, employment_type, start_date, visibility, disclosure_status, ai_allowed)
values (
  '11111111-1111-1111-1111-111111111111', 'Acme Restricted', 'Engineer', 'full_time', '2020-01-01',
  'portfolio_public', 'restricted', true
);

select is(
  (select visibility::text from careerops.employments where organization = 'Acme Restricted'),
  'cv_safe',
  'a restricted employment is clamped to cv_safe even when set to portfolio_public'
);

select is(
  (select ai_allowed from careerops.employments where organization = 'Acme Restricted'),
  false,
  'a restricted employment forces ai_allowed to false'
);

-- A highlight on that employment is clamped too, even if set to portfolio_careerops.
insert into careerops.employment_highlights (user_id, employment_id, text, visibility)
select '11111111-1111-1111-1111-111111111111', id, 'Shipped a restricted thing', 'portfolio_public'
from careerops.employments where organization = 'Acme Restricted';

select is(
  (select visibility::text from careerops.employment_highlights where text = 'Shipped a restricted thing'),
  'cv_safe',
  'a highlight under a restricted employment is clamped to cv_safe'
);

-- A portfolio_public, not_required employment does not clamp a portfolio_public highlight.
insert into careerops.employments (user_id, organization, title, employment_type, start_date, visibility, disclosure_status)
values (
  '11111111-1111-1111-1111-111111111111', 'OpenCo', 'Engineer', 'full_time', '2021-01-01',
  'portfolio_public', 'not_required'
);

insert into careerops.employment_highlights (user_id, employment_id, text, visibility)
select '11111111-1111-1111-1111-111111111111', id, 'Shipped an open thing', 'portfolio_public'
from careerops.employments where organization = 'OpenCo';

select is(
  (select visibility::text from careerops.employment_highlights where text = 'Shipped an open thing'),
  'portfolio_public',
  'a highlight under a portfolio_public, not_required employment keeps its requested visibility'
);

select * from finish();
rollback;
