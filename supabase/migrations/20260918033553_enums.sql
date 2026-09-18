-- Enums shared across the schema (docs/DOMAIN.md §5.1, §5.2) and the
-- career-history enums used by the tables in the next migration (§4.1).

-- Ordered: private < cv_safe < portfolio_public (DOMAIN §5.1).
create type public.visibility as enum ('private', 'cv_safe', 'portfolio_public');

-- Caps effective visibility per DOMAIN §5.2.
create type public.disclosure_status as enum (
  'not_required',
  'approval_required',
  'approved',
  'restricted'
);

-- Precision of an imprecisely remembered date, paired with a `date` column.
create type public.date_precision as enum ('day', 'month', 'year');

create type public.remote_preference as enum ('remote', 'hybrid', 'onsite', 'any');

create type public.employment_type as enum (
  'full_time',
  'part_time',
  'contract',
  'freelance',
  'military',
  'internship'
);

create type public.credential_status as enum ('planned', 'in_progress', 'earned', 'expired');

-- CEFR levels plus native, per DOMAIN §4.1 languages.
create type public.language_proficiency as enum ('a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'native');
