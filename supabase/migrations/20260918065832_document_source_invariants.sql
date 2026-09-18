-- I4: every document_sources row references a verified fact whose
-- effective visibility meets the document kind's minimum (cv_safe, or
-- portfolio_public for case_study/article).
-- I12: a project_benchmarks source is eligible only if its own_evidence_id
-- is verified and checked_at is within 180 days.
-- (docs/DOMAIN.md §6, ADR-0005, ADR-0009)
--
-- Exactly one of the eight source columns is set (document_sources_
-- exactly_one_source, added in #6), so the if/elsif chain below always
-- matches exactly one branch. "Verified" only applies where the source
-- table actually carries a verification signal (evidence.verified_at,
-- employment_highlights.verified_at, credentials.status = 'earned');
-- other source tables have no such column and are treated as verified by
-- existing.

create function public.enforce_document_source_invariants()
returns trigger
language plpgsql
as $$
declare
  doc_kind public.document_kind;
  min_visibility public.visibility;
  source_visibility public.visibility;
  source_verified boolean;
begin
  select d.kind into doc_kind
  from public.document_versions dv
  join public.documents d on d.id = dv.document_id
  where dv.id = new.document_version_id;

  min_visibility := case when doc_kind in ('case_study', 'article') then 'portfolio_public' else 'cv_safe' end;

  if new.evidence_id is not null then
    select visibility, (verified_at is not null) into source_visibility, source_verified
    from public.evidence where id = new.evidence_id;

  elsif new.employment_highlight_id is not null then
    select visibility, (verified_at is not null) into source_visibility, source_verified
    from public.employment_highlights where id = new.employment_highlight_id;

  elsif new.project_benchmark_id is not null then
    select pb.visibility, (ev.verified_at is not null) into source_visibility, source_verified
    from public.project_benchmarks pb
    left join public.evidence ev on ev.id = pb.own_evidence_id
    where pb.id = new.project_benchmark_id;

    if source_visibility is null then
      raise exception 'document_sources row references a project_benchmark that does not exist';
    end if;

    if not exists (
      select 1 from public.project_benchmarks
      where id = new.project_benchmark_id
        and checked_at is not null
        and checked_at >= current_date - interval '180 days'
    ) then
      raise exception 'project_benchmark % is not eligible as a source: checked_at must be within 180 days (I12)',
        new.project_benchmark_id;
    end if;

  elsif new.employment_id is not null then
    select visibility, true into source_visibility, source_verified
    from public.employments where id = new.employment_id;

  elsif new.project_id is not null then
    select visibility, true into source_visibility, source_verified
    from public.projects where id = new.project_id;

  elsif new.project_decision_id is not null then
    select visibility, true into source_visibility, source_verified
    from public.project_decisions where id = new.project_decision_id;

  elsif new.credential_id is not null then
    select visibility, (status = 'earned') into source_visibility, source_verified
    from public.credentials where id = new.credential_id;

  elsif new.education_id is not null then
    select visibility, true into source_visibility, source_verified
    from public.education where id = new.education_id;
  end if;

  if source_visibility is null then
    raise exception 'document_sources row references a source that does not exist';
  end if;

  if not source_verified then
    raise exception 'document_sources row references an unverified fact (I4)';
  end if;

  if source_visibility < min_visibility then
    raise exception 'source visibility % is below the % minimum required for document kind % (I4)',
      source_visibility, min_visibility, doc_kind;
  end if;

  return new;
end;
$$;

create trigger enforce_document_source_invariants
  before insert or update on public.document_sources
  for each row execute function public.enforce_document_source_invariants();
