# Environments

| | Local | Staging | Production |
|---|---|---|---|
| **Purpose** | Development and tests | Integration, release verification, **public demo** | Real use |
| **Source** | Working tree | `develop` | `main` (tagged releases) |
| **Database** | Supabase CLI stack in Docker | Supabase project `careerops-staging` (EU) | Supabase project `careerops-production` (EU) |
| **Data** | `supabase/seed/demo.sql` | Fictional demo persona only | Real career data |
| **Web** | `pnpm dev` | Vercel project, staging domain | Vercel project, production domain |
| **Mobile** | Simulator and device | TestFlight internal, Android internal track | Same tracks; no public store listing |
| **Deploy** | — | Automatic on merge to `develop` | On release, after approval in the `production` environment |
| **Migrations** | `supabase db reset` | `supabase db push` in CI | `supabase db push` in CI, after staging succeeded |
| **Auth** | Local users | Demo account, sign-ups disabled | Single owner account with MFA, sign-ups disabled |
| **Backups** | — | Not required (reproducible from seed) | Nightly encrypted dump and storage sync to S3; monthly restore drill |
| **AI** | Optional local Ollama | Disabled or cloud provider with demo data | Local worker over Tailscale; cloud provider optional |

## Rules

- Real data exists only in production and in encrypted backups. Staging is safe to show anyone.
- Migrations flow in one direction: local → staging → production. Nobody edits a schema in the dashboard; CI checks for drift.
- Secrets live in GitHub environment secrets (`staging`, `production`) and Vercel environment variables. `.env.example` lists names only.
- The service-role key exists only in server-side environments and CI.
- CareerOps shares a Supabase project with another live application and owns the `careerops` schema (ADR-0016). `supabase db reset` is never run against it: the command drops everything, including the other application. Migrations reach it only through `supabase db push`, which is additive.
- Free tiers are used initially. Free Supabase projects pause after inactivity and have no point-in-time recovery, so the nightly production backup job also acts as a keep-alive and health check.

## Provisioning timeline

| Phase | What is created |
|---|---|
| 0–1 | Local stack only; GitHub environments `staging` and `production` defined without secrets |
| 2 | Supabase staging and production projects, Vercel projects, deploy workflows — created once `apps/web` exists, so nothing sits idle and pausing |
| 8 | Terraform takes ownership of Vercel, Supabase and AWS resources (`infra/terraform/envs/*`); backup bucket and GitHub OIDC role |

Until phase 8 there is no keep-alive job, so a free staging project pauses after
about a week of inactivity. Unpausing is a click; it is a nuisance rather than a
risk, and it is the reason the projects are created when there is something to
deploy rather than in advance.
