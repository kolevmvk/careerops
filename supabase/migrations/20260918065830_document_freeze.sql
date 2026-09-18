-- I2: a frozen document version cannot be updated or deleted.
-- I3: linking a document version to an opportunity freezes it.
-- (docs/DOMAIN.md §6, ADR-0005)

create function careerops.enforce_document_version_immutable()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'DELETE' then
    if old.status = 'frozen' then
      raise exception 'frozen document version % cannot be deleted (I2)', old.id;
    end if;
    return old;
  end if;

  if old.status = 'frozen' then
    raise exception 'frozen document version % is immutable (I2)', old.id;
  end if;

  return new;
end;
$$;

create trigger enforce_document_version_immutable
  before update or delete on careerops.document_versions
  for each row execute function careerops.enforce_document_version_immutable();

-- Runs as a plain BEFORE INSERT trigger, so the UPDATE below still passes
-- through enforce_document_version_immutable above (old.status is 'draft'
-- at that point, so the freeze transition itself is allowed).
create function careerops.freeze_document_version_on_link()
returns trigger
language plpgsql
as $$
begin
  update careerops.document_versions
  set status = 'frozen', frozen_at = now()
  where id = new.document_version_id
    and status <> 'frozen';

  return new;
end;
$$;

create trigger freeze_document_version_on_link
  before insert on careerops.opportunity_documents
  for each row execute function careerops.freeze_document_version_on_link();
