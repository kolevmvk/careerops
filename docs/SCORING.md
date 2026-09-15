# CareerOps — Scoring Model

Status: draft for v0.1 · Scoring version `1.0.0` · Supersedes sections 11 and 22 of Specification v1.0 · Entities: [DOMAIN.md](DOMAIN.md)

---

## 1. Rules

1. **Deterministic.** Every score is reproducible from database rows and one `scoring_configs` row. No LLM is involved in computing a number.
2. **Decomposable.** Every score stores a `breakdown` that the UI renders as *why*. A score without a visible breakdown is a bug.
3. **Versioned.** The package exports `SCORING_VERSION` (semver). Formula changes bump the minor or major version; weight changes create a new `scoring_configs` row. Snapshots store both.
4. **Separate concepts stay separate.** Six scores, never collapsed into one number:

| Score | Subject | Question it answers |
|---|---|---|
| Effective level | user skill | What level can I defend right now? |
| Evidence confidence | user skill | How solid is the proof behind that level? |
| Market frequency | skill × target role | How often do real target jobs ask for it? |
| Job match | job | How well do I cover this job, and what blocks me? |
| Gap priority | skill × target role | What should I work on next? |
| Readiness | target role | How ready am I for this role family overall? |

5. **One implementation.** Scoring lives in `packages/scoring` (TypeScript, pure functions, no I/O). A server route loads inputs, calls the package and writes snapshots. The mobile app only reads snapshots.

### 1.1 When scores are recomputed

- A Supabase database webhook fires on writes to `evidence`, `evidence_skills`, `skill_assessments`, `user_skills`, `jobs`, `job_requirements`, `target_roles` and `scoring_configs`, and calls a signed recompute endpoint.
- A nightly job recomputes everything, which also applies recency decay.
- For a single user a full recompute takes milliseconds, so there is no incremental cleverness.

---

## 2. Inputs and numeric mappings

Human input stays ordinal. The config maps it to numbers.

### 2.1 Evidence type weight `w_type`

| Type | Weight | Reason |
|---|---:|---|
| `production_deployment` | 1.00 | Operated under real conditions. |
| `release` | 0.90 | Shipped to real users through a real distribution channel. |
| `work_experience` | 0.90 | Sustained professional use. |
| `incident_record` | 0.85 | Troubleshooting under pressure is hard to fake. |
| `repository`, `pull_request` | 0.75 | Inspectable implementation. |
| `design_document` | 0.70 | Design capability; weaker without implementation. |
| `lab`, `demo_url`, `documentation` | 0.50 | Useful for emerging skills. |
| `certification` | 0.40 | Knowledge signal, not practical depth. |
| `article` | 0.40 | Communication and understanding. |
| `course_completion` | 0.15 | Learning signal only. |

### 2.2 Link strength `s`

| `evidence_skills.strength` | Meaning | `s` |
|---:|---|---:|
| 1 | supporting | 0.40 |
| 2 | substantial | 0.70 |
| 3 | primary | 1.00 |

### 2.3 Recency `r`

Age `a` in months is measured from `occurred_to`, or 0 if ongoing.

```
r(a) = 1                                           if a ≤ grace
r(a) = max(floor, 0.5 ^ ((a − grace) / half_life)) otherwise

defaults: grace = 24, half_life = 60, floor = 0.35
```

Recency is a decay, not a cliff. Twenty years of infrastructure work that ended long ago still counts at the floor. Something done this year counts in full.

### 2.4 Eligibility

A link contributes only if `evidence.verified_at` and `evidence_skills.confirmed_at` are both set (invariant I5). Unverified links show up in the UI as *pending proof*, never in the score.

---

## 3. Evidence confidence

For each eligible link *i* supporting a skill:

```
c_i = w_type(i) × s(i) × r(i)
```

Links are combined with noisy-OR:

```
evidence_confidence = 1 − Π (1 − c_i)
```

Why noisy-OR:
- stays inside 0..1 without clamping
- each additional piece of evidence adds less than the previous one, so spamming labs does not buy confidence
- monotone: adding verified evidence can never lower confidence
- explainable: the breakdown lists each `c_i`

---

## 4. Effective level

- **Assessed level `A`**: the latest `skill_assessments.assessed_level`. If there is no assessment, `A = S`.
- **Supported level `S`**: the highest `demonstrated_level` among eligible links with `c_i ≥ support_threshold` (default 0.5). If there are none, `S = 0`.

```
E = A                                   if A ≤ S
E = S + (A − S) × unsupported_factor    if A > S        default unsupported_factor = 0.5
```

The part of a claim that evidence does not support counts at half value. Confidence is shown next to the level but is **not** multiplied into the match a second time. v1.0 multiplied capability by confidence, which penalized the same gap twice.

### 4.1 Hierarchy roll-up

When a requirement points to skill `k` and the user has no `user_skills` row for `k`:

| Situation | Effective level used |
|---|---|
| `k` is a child; the user tracks the parent | `E_parent × parent_credit` (default 0.5) |
| `k` is a parent; the user tracks children | `max(E_children) × child_credit` (default 0.75) |
| Neither | 0 |

---

## 5. Job match

### 5.1 Skill requirements

For each requirement `j` with `kind = skill` and `mapping_status ∈ {auto, confirmed}`:

```
R_j   = required_level, or default_required_level (3) if unspecified
w_j   = weight_required (1.0) or weight_preferred (0.4)
cov_j = min(E_j / R_j, 1)

match = 100 × Σ (w_j × cov_j) / Σ w_j
```

Unmapped requirements are listed in the breakdown as **unscored** and lower `extraction_coverage`, which is shown next to the score. A 90% match on 40% of the ad is not a 90% match.

### 5.2 Requirement classification

| Class | Rule |
|---|---|
| `strong` | `E ≥ R` and confidence ≥ 0.6 |
| `unproven` | `E ≥ R` and confidence < 0.6 |
| `partial` | 0.6 ≤ `E/R` < 1 |
| `missing` | `E/R` < 0.6 |

`unproven` is the most actionable class: the skill is probably there, but a reviewer cannot see it. The fix is an evidence task, not a course.

### 5.3 Hard constraints gate

Hard constraints never enter the percentage. Each one resolves to `pass`, `warn`, `fail` or `unknown`:

| Kind | Evaluated against |
|---|---|
| `language` | `languages.proficiency` |
| `location`, `work_authorization` | `profiles.location`, `remote_preference`, `work_authorization` |
| `certification` | `credentials.status = earned` |
| `experience_years` | manual confirmation in v0.1; `unknown` until confirmed |
| `clearance`, `education` | manual confirmation |

`constraint_gate` is the worst result, so any `fail` gives `fail`. The UI shows the score and the gate side by side, for example **"78% · fails: German C1"**.

---

## 6. Market frequency

For target role `T`, the corpus `J_T` is the jobs with `target_role_id = T`, `relevance ≥ 1`, not archived, imported within `window_days` (default 180).

```
f(k, T) = Σ_{job ∈ J_T} importance(job, k) / |J_T|       importance: required 1.0 · preferred 0.5 · absent 0
```

Counts roll up: a requirement for a child skill also counts toward its parent at `rollup_factor` (default 0.5), so "IAM" and "VPC" ads raise the frequency of "AWS".

Across roles:

```
F(k) = Σ_T weight_T × f(k, T) / Σ_T weight_T
```

**Minimum sample.** If `|J_T| < min_sample` (default 10), `f(k, T)` is still shown but flagged `insufficient_data`, and gap priority for `T` is marked provisional.

---

## 7. Gap priority

### 7.1 Target level

```
R*(k, T) = user_skills.target_level                          if set
         = weighted median of required_level for k in J_T    otherwise (default 3 when unspecified)
```

### 7.2 Gap type

| Gap type | Rule | Typical next action |
|---|---|---|
| `learn` | `E < R*` | Evidence-producing roadmap item. |
| `prove` | `E ≥ R*` and confidence < 0.6 | Write up, publish or verify existing work. |
| `none` | otherwise | Maintain. |

### 7.3 Priority

Additive, so that one weak factor does not zero out the result the way v1.0's product formula did:

```
gap_norm         = max(0, R* − E) / 5
evidence_deficit = 1 − evidence_confidence
feasibility      = low 0.2 · medium 0.6 · high 1.0

priority = 100 × ( 0.45 × F(k)
                 + 0.30 × gap_norm
                 + 0.15 × evidence_deficit
                 + 0.10 × feasibility )          if gap_type ≠ none
         = 0                                     otherwise
```

Hard-constraint skills that fail in any benchmark job (`relevance = 2`) get `+ hard_constraint_bonus` (default 15), capped at 100.

| Label | Rule |
|---|---|
| High-value gap | `F ≥ 0.40` and `gap_type ≠ none` |
| Low-value gap | `F < 0.15` and no hard-constraint involvement |

---

## 8. Readiness

For target role `T`, readiness is the job-match formula applied to the aggregated demand profile of the corpus instead of a single ad:

```
readiness(T) = 100 × Σ_k f(k, T) × min(E_k / R*(k, T), 1) / Σ_k f(k, T)
```

Stored with `sample_size = |J_T|` and `sufficient_data = |J_T| ≥ min_sample`. There is no generic readiness without a target role.

---

## 9. Opportunity signals

Opportunities are judged by people. The system supplies consistent signals, not a verdict.

| Signal | Rule |
|---|---|
| `pursuit_score` | `fit × receptiveness` (1–25), shown with the track weight from settings. Sorts the outreach queue. |
| `terms_gate` | `below_floor` if expected or offered compensation is below the target role floor after normalizing currency, period and basis; `unknown` if missing; `ok` otherwise. |
| `match_ref` | For `origin = job_ad`, the current job match score and constraint gate. |
| `staleness` | Days since the last `opportunity_events` row, compared with the follow-up threshold in settings. |

### 9.1 Funnel metrics

Computed per track and per origin, never as one blended number:

```
response_rate   = opportunities reaching `conversation` / opportunities reaching `contacted`
evaluation_rate = reaching `evaluation` / reaching `contacted`
offer_rate      = with an `offer` event / reaching `contacted`
acceptable_rate = offers with terms_gate = ok / offers
```

These metrics answer the strategic question the documents raise but cannot settle: whether outreach built on shipped product proof works better than answering ads, and on which track acceptable terms actually appear.

---

## 10. Configuration

```jsonc
// scoring_configs.weights, version 1.0.0 defaults
{
  "evidence_type_weight": { "production_deployment": 1.0, "release": 0.9, "work_experience": 0.9,
                            "incident_record": 0.85, "repository": 0.75, "pull_request": 0.75,
                            "design_document": 0.7, "lab": 0.5, "demo_url": 0.5, "documentation": 0.5,
                            "certification": 0.4, "article": 0.4, "course_completion": 0.15 },
  "strength": { "1": 0.4, "2": 0.7, "3": 1.0 },
  "recency": { "grace_months": 24, "half_life_months": 60, "floor": 0.35 },
  "support_threshold": 0.5,
  "unsupported_factor": 0.5,
  "hierarchy": { "parent_credit": 0.5, "child_credit": 0.75, "rollup_factor": 0.5 },
  "match": { "default_required_level": 3, "weight_required": 1.0, "weight_preferred": 0.4 },
  "classification": { "confidence_strong": 0.6, "partial_ratio": 0.6 },
  "market": { "window_days": 180, "min_sample": 10 },
  "gap": { "w_frequency": 0.45, "w_gap": 0.30, "w_evidence": 0.15, "w_feasibility": 0.10,
           "feasibility": { "low": 0.2, "medium": 0.6, "high": 1.0 }, "hard_constraint_bonus": 15 }
}
```

---

## 11. Worked example (illustrative numbers)

Skill **Docker**. Assessed level `A = 3`.

| Link | Type | `w` | Strength | `s` | Age | `r` | `c_i` | Demonstrated |
|---|---|---:|---:|---:|---|---:|---:|---:|
| Compose lab with networking and healthchecks | lab | 0.50 | 3 | 1.0 | 3 mo | 1.0 | 0.50 | 2 |
| Repository with CI image build | repository | 0.75 | 2 | 0.7 | 1 mo | 1.0 | 0.525 | 2 |

```
confidence = 1 − (1 − 0.50)(1 − 0.525) = 1 − 0.2375 = 0.76
S = 2 (both links ≥ 0.5)
E = 2 + (3 − 2) × 0.5 = 2.5
```

A job requires Docker at level 3: `cov = 2.5 / 3 = 0.83`, so the class is **partial**.
Suppose `F(Docker) = 0.62` with `feasibility = high`:

```
priority = 100 × (0.45×0.62 + 0.30×(0.5/5) + 0.15×0.24 + 0.10×1.0)
         = 100 × (0.279 + 0.030 + 0.036 + 0.100) = 44.5   → high-value gap (F ≥ 0.40)
```

Breakdown shown to the user: *"Docker 2.5 of 3. Evidence supports 2, and your assessment of 3 is half-credited. Market demand 0.62 across target roles. Next: a production deployment with a restore test would move evidence to level 3."*

---

## 12. Tests

- **Golden fixtures:** the worked examples in this document are unit tests. If the prose and the code disagree, the build fails.
- **Property tests:**
  - adding verified evidence never lowers confidence or effective level
  - raising `E` never lowers match or readiness
  - adding a required skill the user fully covers never lowers match
- **Version guard:** a snapshot whose config hash differs from its recorded `scoring_config_id` fails CI.
