# SlotForge — Differentiation Research & Pitch Plan

Prepared after researching each proposed feature against real, shipping competitors
and recent academic literature. Goal: walk into the review with claims that survive
scrutiny, not claims that get punctured by "actually, X already does this."

---

## Honest ranking: strongest to weakest claim

### 1. Domain-Based Scheduling Presets — STRONGEST CLAIM
**Verdict: genuinely uncontested.**
Every "multi-domain" or "unified" scheduling product found in research is either
(a) one vendor's single product line unifying *related* activities within one sector
(CollegeNet: course scheduling + room booking + faculty meetings, still all
education), or (b) entirely separate dedicated products with no shared engine
(Deputy for shift work, Teambridge for events, UniTime/FET for academic only).
**Nobody found is doing "one CP-SAT engine, swappable domain vocabulary via
onboarding presets" as a single configurable architecture.** This is the cleanest,
most defensible claim of the five.

**How to say it:** "Every competitor we found either builds one tool per scheduling
domain, or unifies only within one sector. SlotForge's architecture proves the
underlying constraint engine is domain-agnostic — the academic preset is the first
implementation, but the same solver could configure itself for shift rosters or
event scheduling without rewriting the core."

---

### 2. Transparent Multi-Tenant SaaS Accessibility — STRONGEST CLAIM (pre-existing, reinforce)
**Verdict: confirmed in the first research pass, still holds.**
UniTime and FET — the only open, CP-rigorous alternatives — are both self-hosted
(Java/Tomcat/MySQL, manual schema execution, JVM tuning). Commercial SaaS players
(TimetableMaster, aSc, Untis) are accessible but don't expose solving methodology
or infeasibility reasoning. SlotForge already combines both: real Supabase RLS
multi-tenancy + a transparent, named-reason CP-SAT diagnostic layer.

**How to say it:** "This is not a new feature to build — it's already shipped and
working. No competitor combines true zero-deployment multi-tenant signup with a
transparent, named-reason solver. You either get ease of use with a black box, or
rigor with a sysadmin requirement. We have both, today."

---

### 3. Natural-Language Rule Assistant — MODERATE CLAIM, NEEDS CAUTION
**Verdict: a 2026 academic paper exists doing something close — cite it, don't ignore it.**
A 2026 paper from Teegala Krishna Reddy Engineering College ("Voice-Driven
Automated Timetable Generation") does NLP-parsed natural language → constraint
optimization. This is a lab prototype, not a deployed product, and is classical
NLP/voice-first rather than LLM-based. TimetableMaster's "AI" is generic marketing
for a CP-SAT-style solver, not an actual language-to-constraint translator.

**Risk:** if the lecturer or a panelist has seen this paper (plausible, same
academic circuit), claiming pure originality will look uninformed.

**How to say it:** "There's recent academic work doing NLP-to-constraint parsing as
a research prototype — we'd cite it directly rather than claim we invented the
concept. What doesn't exist is this translating into reviewable, editable constraint
objects inside a real multi-tenant SaaS product, where an admin can see exactly what
rule was generated and approve or reject it before it touches a live schedule."

---

### 4. Conflict Heatmap — MODERATE CLAIM
**Verdict: soft overlap with both a 2026 paper and a commercial product, but narrower angle survives.**
A 2026 arXiv paper ("Digital Twin Intelligence for Adaptive Campus Timetabling")
includes a near-identical room-occupancy heatmap. Coursedog (commercial, real
product) does utilization/enrollment-pattern visualization — adjacent, not
identical. Neither ties the heatmap specifically to *why the CP-SAT solver
struggled or returned infeasible* — they visualize occupancy/utilization patterns,
not solver bottleneck diagnostics.

**How to say it:** "Room-utilization heatmaps exist elsewhere. What's different here
is tying the visualization directly to the solver's own infeasibility reasoning —
showing not just that a room is busy, but that it was the specific bottleneck
causing a generation to fail, using the same diagnostic data the solver already
produces."

---

### 5. Constraint Playground — WEAKEST CLAIM
**Verdict: closest to "already exists," be ready to reframe on the spot.**
Timetabling Turbo (a real, documented, shipping commercial product) has min/max/
desirable value constraints with critical/required/desirable priority tiers,
runtime-editable, with a violation-tracking column — functionally very close to
what was proposed.

**The narrower angle that still survives:** Turbo's constraints are numeric
solver-internal values (min/max on a formula's output). SlotForge's angle would be
named, institution-level policy language ("no classes after lunch for Dr. Rao")
combined with the *existing* infeasibility diagnostic system to show which named
custom rule caused a failure — not just "constraint #14 violated."

**How to say it:** "Rule-based constraint configuration exists in commercial tools
already — we wouldn't claim that part as new. The differentiation is in combining
institution-readable rule names with our existing infeasibility diagnosis, so a
failure message says 'Dr. Rao's no-afternoon-classes rule conflicts with Room 204's
limited morning availability' instead of a generic constraint-violation code."

---

## What to actually present, in order

**Lead with #2 (already built) to establish credibility** — this isn't a "we will
build X," it's "we already built X, here's proof" (Phase 3 multi-tenancy + Phase 1
infeasibility diagnostics, both demonstrably working).

**Then #1 (Domain Presets) as the primary new-feature pitch** — strongest, cleanest,
most architecturally significant claim, and it reframes the whole project from
"a timetable generator" to "a configurable scheduling platform," which directly
answers "why build a new one" by changing what "one" means.

**Mention #3 and #4 as secondary roadmap items**, explicitly citing the academic
papers found rather than hiding them — this demonstrates research rigor, which is
likely to land well with a reviewer who already pushed back once on originality.

**Either fold #5 into #3 as a sub-feature, or drop it from the pitch entirely** — it's
the one most likely to get immediately countered with "but X already does this,"
and being caught flat-footed on the weakest claim undermines the stronger ones said
moments earlier.

**Do not present #5 (Version Control) or #6 (Explainable Scheduling) from the
original list as new differentiators** — both substantially overlap with what's
already built and documented in the existing abstract. Folding them in as "depth we
will add to what already exists" is honest; presenting them as new standout
features risks the lecturer noticing the contradiction with what was already shown.

---

## One sentence to open with

"Our review feedback was fair — generic timetabling exists. What we found through
research is that the genuine gap isn't the solver itself, it's that every rigorous
open alternative requires a sysadmin to deploy, and every accessible SaaS alternative
hides its reasoning. We already close that gap. The next step is proving the same
engine generalizes beyond academic timetabling entirely — which no competitor, open
or commercial, currently does."
