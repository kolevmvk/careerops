-- I1: effective visibility never exceeds the disclosure ceiling or the
-- parent's effective visibility (docs/DOMAIN.md §5.2, §6, ADR-0004).
--
-- Only employments and projects carry disclosure_status; evidence,
-- employment_highlights and project_decisions have no ceiling of their own
-- and are capped purely by their parent. Because this trigger runs on
-- every insert/update of the five covered tables, a parent's stored
-- `visibility` column is always already its effective visibility by
-- induction, so reading it directly (rather than recursing) is sufficient.
--
-- The ceiling is enforced by clamping, not by rejecting the write: a
-- restricted employment silently caps a bullet's visibility rather than
-- failing the save, matching "caps" and "forced" in DOMAIN §5.2.

create function public.enforce_visibility_ceiling()
returns trigger
language plpgsql
as $$
declare
  cap public.visibility;
  parent_visibility public.visibility;
begin
  if TG_TABLE_NAME in ('employments', 'projects') then
    cap := case NEW.disclosure_status
      when 'restricted' then 'cv_safe'
      when 'approval_required' then 'cv_safe'
      else 'portfolio_public'
    end;
    if NEW.disclosure_status = 'restricted' then
      NEW.ai_allowed := false;
    end if;
  else
    cap := 'portfolio_public';
  end if;

  if TG_TABLE_NAME = 'projects' then
    if NEW.parent_project_id is not null then
      select visibility into parent_visibility from public.projects where id = NEW.parent_project_id;
      if parent_visibility is not null and parent_visibility < cap then
        cap := parent_visibility;
      end if;
    end if;
    if NEW.employment_id is not null then
      select visibility into parent_visibility from public.employments where id = NEW.employment_id;
      if parent_visibility is not null and parent_visibility < cap then
        cap := parent_visibility;
      end if;
    end if;
  elsif TG_TABLE_NAME = 'evidence' then
    if NEW.project_id is not null then
      select visibility into parent_visibility from public.projects where id = NEW.project_id;
      if parent_visibility is not null and parent_visibility < cap then
        cap := parent_visibility;
      end if;
    end if;
    if NEW.employment_id is not null then
      select visibility into parent_visibility from public.employments where id = NEW.employment_id;
      if parent_visibility is not null and parent_visibility < cap then
        cap := parent_visibility;
      end if;
    end if;
  elsif TG_TABLE_NAME = 'employment_highlights' then
    select visibility into parent_visibility from public.employments where id = NEW.employment_id;
    if parent_visibility is not null and parent_visibility < cap then
      cap := parent_visibility;
    end if;
  elsif TG_TABLE_NAME = 'project_decisions' then
    select visibility into parent_visibility from public.projects where id = NEW.project_id;
    if parent_visibility is not null and parent_visibility < cap then
      cap := parent_visibility;
    end if;
  end if;

  if NEW.visibility > cap then
    NEW.visibility := cap;
  end if;

  return new;
end;
$$;

create trigger enforce_visibility_ceiling
  before insert or update on public.employments
  for each row execute function public.enforce_visibility_ceiling();

create trigger enforce_visibility_ceiling
  before insert or update on public.projects
  for each row execute function public.enforce_visibility_ceiling();

create trigger enforce_visibility_ceiling
  before insert or update on public.evidence
  for each row execute function public.enforce_visibility_ceiling();

create trigger enforce_visibility_ceiling
  before insert or update on public.employment_highlights
  for each row execute function public.enforce_visibility_ceiling();

create trigger enforce_visibility_ceiling
  before insert or update on public.project_decisions
  for each row execute function public.enforce_visibility_ceiling();
