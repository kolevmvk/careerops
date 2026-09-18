-- Wires up the forward references left as plain uuid columns in
-- 20260918033556_career_history.sql, now that their target tables exist.

alter table public.employment_highlights
  add constraint employment_highlights_evidence_id_fkey
  foreign key (evidence_id) references public.evidence (id);

alter table public.credentials
  add constraint credentials_learning_resource_id_fkey
  foreign key (learning_resource_id) references public.learning_resources (id);
