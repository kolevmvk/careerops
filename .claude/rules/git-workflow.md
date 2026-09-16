# Git workflow

The process is described in `CONTRIBUTING.md` and decided in ADR-0013. This is
what matters while working; the guard hook enforces the irreversible parts.

- Branch from `develop` as `feature/<issue>-<slug>`, `fix/<issue>-<slug>`,
  `chore/…`, `docs/…`, `ci/…`. The `branch-policy` check rejects anything else.
- One logical change per commit. Conventional Commits with a lowercase subject;
  the body explains why, not what the diff already shows.
- The pull request title becomes the squash commit on `develop`, so it follows
  the same format and is checked by `pr-title`.
- Run `pnpm check` before pushing, and `supabase test db` when `supabase/`
  changed. Pushing to find out whether CI passes wastes a review cycle.
- Rewriting a pushed feature branch uses `--force-with-lease`, never `--force`.
- Merging is the owner's decision. Releases to `main` need explicit approval
  every time; earlier approval does not carry over.
- Issues close by hand after merge: only merges to the default branch close
  them automatically.
