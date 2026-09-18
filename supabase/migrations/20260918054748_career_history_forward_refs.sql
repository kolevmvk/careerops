-- Wires up the forward references left as plain uuid columns in
-- 20260918033556_career_history.sql, now that their target tables exist.

alter table careerops.employment_highlights
  add constraint employment_highlights_evidence_id_fkey
  foreign key (evidence_id) references careerops.evidence (id);

alter table careerops.credentials
  add constraint credentials_learning_resource_id_fkey
  foreign key (learning_resource_id) references careerops.learning_resources (id);
