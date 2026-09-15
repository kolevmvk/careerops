# ADR-0012: Public code, private data

- **Status:** Accepted
- **Date:** 2026-09-15
- **References:** SPECIFICATION §10.3 · SECURITY.md

## Context

The repository is portfolio evidence and must be public. The data describes a real person's career, including information owned by third parties.

## Decision

Only code, schema, tests, infrastructure, documentation and a fictional demo seed are committed. Real data, source documents, research and exports stay in git-ignored `private/` or in production systems. CI scans full history for secrets.

## Consequences

- Anyone can review the engineering; no one sees the data.
- Real-data fixtures for extraction are sanitized before being committed.
