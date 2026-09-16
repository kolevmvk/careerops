-- Grants for the careerops schema (ADR-0016).
--
-- The `public` schema gets these from Supabase automatically; a schema created
-- by a migration does not, so PostgREST cannot see the tables without them.
--
-- Granting to `authenticated` looks broad, and is not: every table has row
-- level security with a `user_id = auth.uid()` policy, so a signed-in user of
-- the other project sharing this database sees zero rows. The grant opens the
-- door, the policy decides who walks through. `anon` gets usage only, so an
-- unauthenticated caller cannot reach a table at all.

grant usage on schema careerops to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema careerops
  to authenticated, service_role;

grant usage, select on all sequences in schema careerops
  to authenticated, service_role;

grant execute on all functions in schema careerops
  to authenticated, service_role;

-- Later migrations add tables; they inherit these rather than each remembering.
alter default privileges in schema careerops
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema careerops
  grant usage, select on sequences to authenticated, service_role;

alter default privileges in schema careerops
  grant execute on functions to authenticated, service_role;
