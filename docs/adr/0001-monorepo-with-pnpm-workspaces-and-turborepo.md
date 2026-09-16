# ADR-0001: Monorepo with pnpm workspaces and Turborepo

- **Status:** Accepted
- **Date:** 2026-09-15
- **References:** SPECIFICATION §14

## Context

The system has a web app, a mobile app, shared domain packages (scoring, extraction, documents), a worker service, database migrations and infrastructure code. They share contracts and must change together.

## Decision

Use one repository. TypeScript packages are managed with pnpm workspaces and orchestrated with Turborepo; Flutter lives in `apps/mobile` with its own toolchain. The Node version is pinned per repository (`.npmrc` `use-node-version`, `.nvmrc`).

## Consequences

- Atomic changes across schema, domain logic and clients.
- One CI pipeline with task caching.
- The Flutter app does not benefit from Turborepo caching; this is accepted.
