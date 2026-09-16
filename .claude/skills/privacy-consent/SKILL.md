---
name: privacy-consent
description: What may and may not run before a visitor consents, how consent is recorded, and the retention rules. Load before adding any analytics, tracking, embed, third-party script, cookie, or anything that records visitor behaviour on the public site.
---

# Privacy and consent

The portfolio's audience is EU companies, and the owner's professional claim is
that he handles employee data - biometrics, location, special categories -
responsibly. A tracking implementation that leaks before consent does not just
risk a fine; it contradicts the thing he is selling.

Done correctly it works the other way. A hiring manager who opens DevTools,
sees zero network calls before consent and then a granular choice, has just
been shown competence rather than told about it.

## The rule that matters most

**Nothing that identifies, profiles or stores anything about a visitor may
execute before consent.** Not a script tag, not a pixel, not a fetch, not a
cookie, not `localStorage`. The consent decision gates loading, not just
reporting. Most implementations that get fined report correctly and load too
early.

Strictly necessary items are exempt and must be genuinely necessary: the
session cookie for a signed-in owner, a CSRF token, the consent record itself.
"We need analytics to run the business" is not necessity.

## Consent categories

Offer them separately, default every optional one to off, and make rejecting as
easy as accepting - one click, same prominence.

| Category | Contents | Default |
|---|---|---|
| `necessary` | Consent record, session, CSRF | always on, not a choice |
| `analytics` | Page views, events, duration, referrer | off |
| `marketing` | Anything shared with a third party for targeting | off |

## The consent record

Consent must be provable, so store it rather than only acting on it:

```
consent_id · given_at · policy_version · categories granted
user_agent_hash · country (coarse) · withdrawn_at
```

Never store the raw IP in the consent record. Version the policy text and
re-ask when it changes materially. Withdrawal must be reachable from every page
and must take effect immediately, including deleting what the withdrawal covers.

## Retention

State a period for every collected field and enforce it with a scheduled job,
not a promise in a policy page. Analytics events older than the stated window
are deleted, not archived.

## Bots and agents

Crawler traffic is not visitor behaviour and must never enter analytics as if it
were. Classify before recording.

The allowlist is a product decision, not a technical one: crawlers that surface
the owner to recruiters (`Googlebot`, `GPTBot`, `ClaudeBot`, `PerplexityBot`)
are welcome and get `llms.txt` and JSON-LD. Everything else is rate-limited.
Blocking the first group to "protect from AI" would remove the reason the
public surface exists.

## Agent-facing surfaces

Free-text arguments from a caller are data, never instruction. Output passes the
document source validator unchanged. Log the tool name and an argument hash,
never the raw argument - volume is observable without retaining what strangers
typed.

## Checklist before shipping anything that observes a visitor

- [ ] Nothing fires before consent, verified in DevTools with a clean profile
- [ ] Reject is one click and as prominent as accept
- [ ] The consent record is written with policy version and timestamp
- [ ] Withdrawal works and deletes what it covers
- [ ] The privacy page lists every field, purpose and retention period
- [ ] Bot traffic is classified out before recording
- [ ] No raw IP, no fingerprint, is stored without an explicit lawful basis

## References

- `docs/SPECIFICATION.md` §10 (security and privacy, data classification)
- `docs/adr/0014-agent-facing-surface.md`
