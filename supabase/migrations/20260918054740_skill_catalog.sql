-- Skill catalog (docs/DOMAIN.md §3.2, §4.2, ADR-0002).
--
-- RLS is enabled with no policies yet; see supabase/migrations/README.md.

create table careerops.skill_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint skill_categories_user_name_unique unique (user_id, name)
);
comment on table careerops.skill_categories is
  'e.g. Linux, Networking, Cloud, DevOps, Security, Programming, Databases, Automation, Mobile, Web, AI/LLM, Product & Delivery, Soft Skills.';

create trigger set_updated_at
  before update on careerops.skill_categories
  for each row execute function careerops.set_updated_at();

alter table careerops.skill_categories enable row level security;

create table careerops.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  name text not null,
  slug text not null,
  kind careerops.skill_kind not null,
  category_id uuid not null references careerops.skill_categories (id),
  parent_id uuid references careerops.skills (id),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint skills_user_slug_unique unique (user_id, slug),
  constraint skills_not_own_parent check (parent_id is null or parent_id <> id)
);
comment on table careerops.skills is
  'Catalog entry: what a skill is, not the user''s level in it (that is user_skills). Hierarchy depth <= 2, enforced by trigger (I9).';

create trigger set_updated_at
  before update on careerops.skills
  for each row execute function careerops.set_updated_at();

alter table careerops.skills enable row level security;

create index skills_user_id_idx on careerops.skills (user_id);
create index skills_category_id_idx on careerops.skills (category_id);
create index skills_parent_id_idx on careerops.skills (parent_id);

-- I9: skill hierarchy depth <= 2 and acyclic. A skill may only become a child
-- of a root skill (a skill with no parent of its own), and a skill that
-- already has children cannot itself become a child.
create function careerops.enforce_skill_hierarchy_depth()
returns trigger
language plpgsql
as $$
declare
  parent_depth_is_child boolean;
  has_children boolean;
begin
  if new.parent_id is null then
    return new;
  end if;

  select (parent_id is not null) into parent_depth_is_child
  from careerops.skills
  where id = new.parent_id;

  if parent_depth_is_child is null then
    raise exception 'parent skill % does not exist', new.parent_id;
  end if;

  if parent_depth_is_child then
    raise exception 'skill hierarchy depth cannot exceed 2: parent % is itself a child', new.parent_id;
  end if;

  select exists (
    select 1 from careerops.skills where parent_id = new.id
  ) into has_children;

  if has_children then
    raise exception 'skill % already has children and cannot become a child itself', new.id;
  end if;

  return new;
end;
$$;

create trigger enforce_skill_hierarchy_depth
  before insert or update of parent_id on careerops.skills
  for each row execute function careerops.enforce_skill_hierarchy_depth();

create table careerops.skill_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  skill_id uuid not null references careerops.skills (id) on delete cascade,
  alias text not null,
  -- Lowercase, punctuation stripped, whitespace collapsed; the extraction
  -- package matches job-requirement phrases against this column.
  normalized text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint skill_aliases_user_normalized_unique unique (user_id, normalized)
);
comment on table careerops.skill_aliases is
  'Synonyms used by deterministic job extraction, e.g. "Amazon Web Services" -> AWS.';

create trigger set_updated_at
  before update on careerops.skill_aliases
  for each row execute function careerops.set_updated_at();

alter table careerops.skill_aliases enable row level security;

create index skill_aliases_skill_id_idx on careerops.skill_aliases (skill_id);
