-- RLS policies: owner-only access on every table (ADR-0007), no anon
-- access. auth.uid() is null for an unauthenticated request, and
-- `user_id = null` never matches, so anon reads zero rows without any
-- extra revoke.
--
-- I10: audit_log and skill_assessments are append-only -- they get select
-- and insert policies only, never update or delete.
--
-- Two helper functions generate the repetitive policy set for ~39 tables
-- so each table's intent (standard CRUD vs. append-only) stays a one-line,
-- auditable statement. They are migration-time tooling only: dropped at
-- the end of this file so they are never exposed as PostgREST RPCs.

create function public.apply_owner_crud_policies(target_table regclass)
returns void
language plpgsql
as $$
begin
  execute format('create policy select_own on %s for select using (user_id = auth.uid())', target_table);
  execute format('create policy insert_own on %s for insert with check (user_id = auth.uid())', target_table);
  execute format(
    'create policy update_own on %s for update using (user_id = auth.uid()) with check (user_id = auth.uid())',
    target_table
  );
  execute format('create policy delete_own on %s for delete using (user_id = auth.uid())', target_table);
end;
$$;

create function public.apply_owner_append_only_policies(target_table regclass)
returns void
language plpgsql
as $$
begin
  execute format('create policy select_own on %s for select using (user_id = auth.uid())', target_table);
  execute format('create policy insert_own on %s for insert with check (user_id = auth.uid())', target_table);
end;
$$;

-- Career history (#4)
select public.apply_owner_crud_policies('public.profiles');
select public.apply_owner_crud_policies('public.employments');
select public.apply_owner_crud_policies('public.employment_highlights');
select public.apply_owner_crud_policies('public.education');
select public.apply_owner_crud_policies('public.credentials');
select public.apply_owner_crud_policies('public.languages');

-- Skill catalog, user skills, learning, projects, evidence (#5)
select public.apply_owner_crud_policies('public.skill_categories');
select public.apply_owner_crud_policies('public.skills');
select public.apply_owner_crud_policies('public.skill_aliases');
select public.apply_owner_crud_policies('public.user_skills');
select public.apply_owner_append_only_policies('public.skill_assessments');
select public.apply_owner_crud_policies('public.learning_resources');
select public.apply_owner_crud_policies('public.learning_resource_skills');
select public.apply_owner_crud_policies('public.projects');
select public.apply_owner_crud_policies('public.project_decisions');
select public.apply_owner_crud_policies('public.evidence');
select public.apply_owner_crud_policies('public.evidence_skills');
select public.apply_owner_crud_policies('public.project_benchmarks');

-- Market, scoring snapshots, system, documents, opportunities, execution (#6)
select public.apply_owner_crud_policies('public.target_roles');
select public.apply_owner_crud_policies('public.organizations');
select public.apply_owner_crud_policies('public.contacts');
select public.apply_owner_crud_policies('public.jobs');
select public.apply_owner_crud_policies('public.job_requirements');
select public.apply_owner_crud_policies('public.scoring_configs');
select public.apply_owner_crud_policies('public.skill_scores');
select public.apply_owner_crud_policies('public.job_matches');
select public.apply_owner_crud_policies('public.readiness_snapshots');
select public.apply_owner_crud_policies('public.ai_analyses');
select public.apply_owner_crud_policies('public.settings');
select public.apply_owner_append_only_policies('public.audit_log');
select public.apply_owner_crud_policies('public.documents');
select public.apply_owner_crud_policies('public.document_versions');
select public.apply_owner_crud_policies('public.document_sources');
select public.apply_owner_crud_policies('public.opportunities');
select public.apply_owner_crud_policies('public.opportunity_documents');
select public.apply_owner_crud_policies('public.opportunity_events');
select public.apply_owner_crud_policies('public.roadmap_items');
select public.apply_owner_crud_policies('public.roadmap_item_skills');
select public.apply_owner_crud_policies('public.roadmap_item_evidence');
select public.apply_owner_crud_policies('public.tasks');

drop function public.apply_owner_crud_policies(regclass);
drop function public.apply_owner_append_only_policies(regclass);
