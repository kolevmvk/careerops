# ADR-0015: Job intake lanes and the email ingestion boundary

- **Status:** Accepted
- **Date:** 2026-09-16
- **References:** SPECIFICATION §7 · SPECIFICATION §10.1 · SPECIFICATION §4.4 · ADR-0011 · ADR-0012

## Context

The pipeline exists to relieve a volume constraint, but v1.1 admitted ads only by paste or URL, with ATS adapters deferred to v0.2. Paste is recording, not finding: it costs the same attention as reading the ad, so the corpus stays empty and every downstream model — market frequency, gap priority, funnel metrics — starves. The empty job corpus at the end of phase 0 confirmed this in practice.

The obvious fix is to read the platforms where roles are posted. That is not available. LinkedIn, Indeed and comparable boards prohibit automated access in their terms and enforce it against accounts, and the owner's LinkedIn account is the single most valuable channel in the whole strategy. Risking it to save manual entry is a bad trade at any volume.

Separately, recruiter correspondence carries personal data belonging to people who never agreed to be in this system, which the existing four data classes did not cover.

## Decision

**Three intake lanes, all normalizing into one `jobs` table** with dedupe on `url_hash` and normalized `content_hash`:

| Lane | Mechanism | Role |
|---|---|---|
| A | Public ATS APIs (Greenhouse, Lever, Ashby, Workable), pulled per tracked organization | Primary; where postings originate |
| B | Job-alert email in the owner's own mailbox, parsed per sender template | Primary; covers platforms that forbid direct access |
| C | Paste, URL fetch, PWA share target | Fallback |

**No credentialed or automated platform access.** No stored platform passwords or session cookies, no headless browser acting as the user, no automated profile edits or connection requests. Lane A is pulled per organization and never becomes a crawler. Lane C attempts one server-side fetch and asks for a paste on failure.

**Email is the compliance layer.** Alert mail is content the platform chose to send to its recipient; processing one's own correspondence requires no permission from the platform, and coverage is nearly identical because alerts derive from the same postings. This trades structure for legitimacy, deliberately.

**Email ingestion boundary.** The mail worker (`services/mail-worker`) runs on the tailnet alongside the AI worker (ADR-0011), with:

- read-only IMAP scope; it never sends, replies, deletes or marks
- inward grants limited to inserting `jobs` rows and `suggested` opportunity events
- no service-role key, and no read access to career data beyond what matching needs
- local processing through Ollama by default; a cloud provider only if explicitly enabled for the `third_party_correspondence` class
- field minimization on intake: extracted fields are kept, raw bodies are purged after 90 days, and nothing is archived wholesale

Every extracted event is a **proposal** requiring confirmation before it affects the pipeline, funnel metrics or any document.

**New data class `third_party_correspondence`** (§10.1), never rendered into any public surface or generated document.

## Consequences

- Lane B accepts parser fragility: alert formats change without notice, so each sender template needs fixtures and will break periodically. This is the price of the compliant path and is budgeted as maintenance, not treated as a defect.
- Lane A's coverage is bounded by which organizations are tracked, so `organizations` becomes an intake input and not only a research record.
- The system now stores other people's personal data, which brings retention, minimization and purge obligations that did not previously apply. The 90-day purge needs a scheduled job and a test.
- Confirmation-before-effect keeps the operator in the loop but adds a review queue that could itself become a backlog. If it does, tighten classification precision rather than removing confirmation.
- ATS adapters move from v0.2 into v0.1, and the AI layer is promoted to v0.1 with them, since lane B is not useful without classification.
- Revisit if a platform offers a legitimate candidate API, or if alert-parser maintenance exceeds the manual entry it replaces.
