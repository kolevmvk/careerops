-- I7: a roadmap item with requires_evidence cannot become done without at
-- least one verified linked evidence row (docs/DOMAIN.md §6).

create function careerops.enforce_roadmap_evidence_required()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and old.status <> 'done' and new.requires_evidence then
    if not exists (
      select 1
      from careerops.roadmap_item_evidence rie
      join careerops.evidence e on e.id = rie.evidence_id
      where rie.roadmap_item_id = new.id
        and e.verified_at is not null
    ) then
      raise exception 'roadmap item % requires at least one verified evidence row before it can be done (I7)', new.id;
    end if;
  end if;

  return new;
end;
$$;

create trigger enforce_roadmap_evidence_required
  before update on careerops.roadmap_items
  for each row execute function careerops.enforce_roadmap_evidence_required();
