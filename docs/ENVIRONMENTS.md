# Environments

| | Local | Staging | Production |
|---|---|---|---|
| **Purpose** | Development and tests | Integration, release verification, **public demo** | Real use |
| **Source** | Working tree | `develop` | `main` (tagged releases) |
| **Database** | Supabase CLI stack in Docker | Supabase project `careerops-staging` (EU) | Supabase project `careerops-production` (EU) |
| **Data** | `supabase/seed/demo.sql` | Fictional demo persona only | Real career data |
| **Client** | Ideal Planner app, local build | Ideal Planner app pointed at staging | Ideal Planner app pointed at production |
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
- Free tiers are used initially. Free Supabase projects pause after inactivity and have no point-in-time recovery, so the nightly production backup job also acts as a keep-alive and health check.

## Provisioning timeline

| Phase | What is created |
|---|---|
| 0–1 | Local stack only; GitHub environments `staging` and `production` defined without secrets |
| 2 | Supabase staging and production projects, deploy workflows |
| 6 | Terraform takes ownership of Supabase and AWS resources (`infra/terraform/envs/*`); backup bucket and GitHub OIDC role |

**Not yet reconciled with this table:** as of 2026-09-18 all 23 migrations are applied to a real, already-existing Supabase project (`kolevmvk-platform`, ref `eujssgievuvtasvhqqcw`) shared with other unrelated projects (ADR-0015), under a dedicated `careerops` schema -- not a dedicated `careerops-staging`/`careerops-production` pair as this table still describes. Whether that shared project stands in for staging, for production, or whether dedicated staging/production projects still get created later, is an open question, not a decision made here.
