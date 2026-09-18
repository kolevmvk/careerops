-- pgTAP test files run in alphabetical order in the same session; this one
-- sorts first and enables the extension for every file that follows.
-- Not wrapped in BEGIN/ROLLBACK like the actual test files: CREATE
-- EXTENSION must commit so pgtap's functions stay available afterwards.
create extension if not exists pgtap with schema extensions;
