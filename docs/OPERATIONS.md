# Operations

Runbooks for operating CareerOps. Sections marked *planned* are completed in the phase shown.

## Release

1. `git switch develop && git pull`
2. `git switch -c release/x.y.z` and open a PR into `main`.
3. Verify on staging: smoke test, migrations applied, no failing checks.
4. Merge the PR. release-please opens a release PR; merge it to tag `vx.y.z`.
5. Approve the deployment in the `production` environment.
6. Back-merge `main` into `develop`.

## Hotfix

1. Branch `hotfix/x.y.z` from `main`.
2. Fix with a test that reproduces the defect.
3. PR into `main`; after release, PR `main` into `develop`.

## Rollback (*planned, phase 2*)

- **Web:** promote the previous Vercel deployment.
- **Database:** migrations are forward-only. Roll back with a new corrective migration; restore from backup only for data loss.

## Backup and restore (*planned, phase 6*)

- **Nightly:** encrypted `pg_dump` plus storage sync to S3 (30 daily and 12 monthly copies).
- **Monthly restore drill:** restore the latest backup into a fresh local stack in CI and run smoke queries. A failed drill opens an issue automatically.

## Incident notes

Record production incidents as issues labeled `type:incident`: symptom, impact, timeline, root cause, fix, follow-ups.
