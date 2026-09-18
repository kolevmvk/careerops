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

create function careerops.apply_owner_crud_policies(target_table regclass)
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

create function careerops.apply_owner_append_only_policies(target_table regclass)
returns void
language plpgsql
as $$
begin
  execute format('create policy select_own on %s for select using (user_id = auth.uid())', target_table);
  execute format('create policy insert_own on %s for insert with check (user_id = auth.uid())', target_table);
end;
$$;

-- Career history (#4)
select careerops.apply_owner_crud_policies('careerops.profiles');
select careerops.apply_owner_crud_policies('careerops.employments');
select careerops.apply_owner_crud_policies('careerops.employment_highlights');
select careerops.apply_owner_crud_policies('careerops.education');
select careerops.apply_owner_crud_policies('careerops.credentials');
select careerops.apply_owner_crud_policies('careerops.languages');

-- Skill catalog, user skills, learning, projects, evidence (#5)
select careerops.apply_owner_crud_policies('careerops.skill_categories');
select careerops.apply_owner_crud_policies('careerops.skills');
select careerops.apply_owner_crud_policies('careerops.skill_aliases');
select careerops.apply_owner_crud_policies('careerops.user_skills');
select careerops.apply_owner_append_only_policies('careerops.skill_assessments');
select careerops.apply_owner_crud_policies('careerops.learning_resources');
select careerops.apply_owner_crud_policies('careerops.learning_resource_skills');
select careerops.apply_owner_crud_policies('careerops.projects');
select careerops.apply_owner_crud_policies('careerops.project_decisions');
select careerops.apply_owner_crud_policies('careerops.evidence');
select careerops.apply_owner_crud_policies('careerops.evidence_skills');
select careerops.apply_owner_crud_policies('careerops.project_benchmarks');

-- Market, scoring snapshots, system, documents, opportunities, execution (#6)
select careerops.apply_owner_crud_policies('careerops.target_roles');
select careerops.apply_owner_crud_policies('careerops.organizations');
select careerops.apply_owner_crud_policies('careerops.contacts');
select careerops.apply_owner_crud_policies('careerops.jobs');
select careerops.apply_owner_crud_policies('careerops.job_requirements');
select careerops.apply_owner_crud_policies('careerops.scoring_configs');
select careerops.apply_owner_crud_policies('careerops.skill_scores');
select careerops.apply_owner_crud_policies('careerops.job_matches');
select careerops.apply_owner_crud_policies('careerops.readiness_snapshots');
select careerops.apply_owner_crud_policies('careerops.ai_analyses');
select careerops.apply_owner_crud_policies('careerops.settings');
select careerops.apply_owner_append_only_policies('careerops.audit_log');
select careerops.apply_owner_crud_policies('careerops.documents');
select careerops.apply_owner_crud_policies('careerops.document_versions');
select careerops.apply_owner_crud_policies('careerops.document_sources');
select careerops.apply_owner_crud_policies('careerops.opportunities');
select careerops.apply_owner_crud_policies('careerops.opportunity_documents');
select careerops.apply_owner_crud_policies('careerops.opportunity_events');
select careerops.apply_owner_crud_policies('careerops.roadmap_items');
select careerops.apply_owner_crud_policies('careerops.roadmap_item_skills');
select careerops.apply_owner_crud_policies('careerops.roadmap_item_evidence');
select careerops.apply_owner_crud_policies('careerops.tasks');

drop function careerops.apply_owner_crud_policies(regclass);
drop function careerops.apply_owner_append_only_policies(regclass);
