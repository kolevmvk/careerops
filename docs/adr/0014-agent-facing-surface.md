# ADR-0014: Agent-facing surface over public facts

- **Status:** Accepted
- **Date:** 2026-09-16
- **References:** SPECIFICATION §13 · SPECIFICATION §8 · DOMAIN §5 · ADR-0004 · ADR-0012

## Context

The party searching for candidates is increasingly software: retrieval-based search, agentic sourcing tools, and the candidate's own assistant answering questions about them. A CV serves a human reader and an ATS keyword match. Neither makes the underlying facts queryable, citable or filterable by a machine.

The system already holds verified facts with an ordered visibility model (`private` < `cv_safe` < `portfolio_public`) and a disclosure ceiling (ADR-0004). Exposing a machine-readable surface is therefore a projection problem, not a new access-control problem — provided the projection is bound by the existing clearance rather than working around it.

Two honest constraints shaped this decision. Sourcing over MCP has effectively no adoption today, so the surface cannot be justified by expected inbound traffic. And any public endpoint that accepts free text is an injection target, which matters more than usual here because the output makes factual claims about a person.

## Decision

Expose a read-only agent-facing surface built on a dedicated `public_facts` view containing `portfolio_public` facts only:

- **Static outputs** generated at build time: JSON-LD `Person` (`knowsAbout`, `hasCredential`, `subjectOf`), `llms.txt`, and a sitemap over curated markdown.
- **MCP server** (`services/mcp`) with `search_evidence`, `get_project` and `list_capabilities` in v0.1, and `assess_fit` deferred to v0.2 until scoring has a real ad corpus behind it.
- **No write tools, no contact tools**, and no tool reaching terms, floors, contacts, organization research or pipeline state.
- **Pull only.** The surface answers when called; it never posts, registers or injects itself into another party's system.
- Free-text arguments are treated as data, never instruction. Tool output passes the §8 source validator unchanged, so a caller cannot obtain a claim the document engine would refuse to make.
- Anonymous reads are rate-limited per address and logged with tool name and argument hash, never the raw argument.

Outbound presence is generation, not posting: platform profile text (LinkedIn, Infostud, Joberty, Wellfound, GitHub) is rendered from the same facts through the same guardrails, and pasted by the user.

The surface is justified on three grounds that hold at zero inbound traffic: the owner's own agent needs a grounded source of truth; machine-readable public facts are what retrieval-based search actually ingests; and building it is itself evidence of the AI-integration and secure-boundary skills the target roles ask for.

## Consequences

- The visibility model becomes load-bearing for a public surface. A mislabeled fact is now a disclosure, so `portfolio_public` clearance needs the same care as sending a document.
- The §8 source validator must run on the MCP output path, not only in document assembly. This is a refactor: the validator moves behind a shared interface.
- `public_facts` is a new projection to maintain, test and keep in sync with the visibility ceiling triggers. It needs pgTAP coverage proving no private row is reachable.
- Scoring gains a second consumer, so its explanations must be safe to show to a stranger.
- If MCP sourcing never materializes, the artifact still pays for itself as portfolio evidence and as the owner's agent backend. This is accepted deliberately rather than assumed away.
- Revisit when a real inbound query arrives from a third party, or when a platform publishes a candidate-facing agent protocol worth supporting.
