-- I6: AI inputs are built only from views that exclude ai_allowed = false
-- (docs/DOMAIN.md §6).
--
-- security_invoker keeps these views subject to the querying role's own
-- RLS policies (Postgres would otherwise run a view with the privileges of
-- its owner, which could bypass RLS). Granting a dedicated ai_worker role
-- read access to exactly these views -- and nothing else -- is phase 8
-- (services/ai-worker); for now they exist so no other code path is built
-- against the unfiltered base tables.

create view careerops.ai_context_employments
with (security_invoker = true) as
select * from careerops.employments where ai_allowed = true;

create view careerops.ai_context_projects
with (security_invoker = true) as
select * from careerops.projects where ai_allowed = true;

create view careerops.ai_context_evidence
with (security_invoker = true) as
select * from careerops.evidence where ai_allowed = true;
