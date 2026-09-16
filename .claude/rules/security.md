---
paths:
  - "apps/**"
  - "packages/**"
  - "services/**"
  - "supabase/**"
  - "infra/**"
  - ".github/**"
  - ".env.example"
---

# Security and data boundaries

The code is public and the data is not (ADR-0012). Most mistakes here cannot be
undone by a later commit, because the history is already public.

- Secrets live in GitHub environment secrets and hosting environment variables.
  `.env.example` lists names only, never values, not even local ones.
- The service-role key exists only in server code and CI. It never appears in
  `NEXT_PUBLIC_*`, a client component, the mobile app or a log line.
- Nothing from `private/` enters a tracked file: no real names, employers,
  clients, figures or job-ad text. Tests and fixtures use the fictional demo
  persona.
- Row level security is the boundary. Checks in `proxy.ts` or a page are
  convenience and never the only thing standing between a caller and a row.
- GitHub Actions are pinned to a commit SHA with the version in a comment, and
  workflows start from `permissions: contents: read`.
- Logs record identifiers and outcomes, not document bodies, message contents
  or free text typed by a visitor (store a hash when volume matters).
- Anything that observes a visitor goes through the `privacy-consent` skill
  first. Nothing loads before consent.
