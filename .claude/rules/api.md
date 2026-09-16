---
paths:
  - "apps/web/app/**"
  - "apps/web/lib/**"
  - "apps/web/proxy.ts"
---

# Server code in the web app

This is Next.js 16, which differs from most training data. Read the relevant
guide in `apps/web/node_modules/next/dist/docs/` before using an API from
memory (`proxy.ts` replaced `middleware.ts`, for example).

- **Mutations are server actions** next to the page that uses them. Each action
  gets the user again with `auth.getUser()` and redirects to `/login` without
  one; a page having rendered is not proof of a session. Rows are written with
  an explicit `user_id` and row level security confirms it.
- **Route handlers are for machine readers** (`llms.txt`, feeds, the agent
  surface), not for the cockpit's own forms.
- **Three Supabase clients, chosen by audience:** `server.ts` for the signed-in
  owner, `client.ts` in the browser, `public.ts` for public pages. Public pages
  read only `public_facts` and `public_profiles`, through `readPublic`, so a
  build never fails because the database is unreachable.
- **`proxy.ts` is a default-deny allowlist.** A new public route is added to
  `PUBLIC_PREFIXES` deliberately, in the same change that creates it.
- **Guardrails run before writes.** A document is validated against its sources
  before it is stored (SPECIFICATION §8); an invalid one is refused, not saved
  with a warning.
- **Errors are thrown or logged, never swallowed.** Returning an empty result on
  failure is allowed only on public reads, and only with a logged reason.
