# SlotForge Frontend — Rebuild Plan v2

## Context

The previous frontend attempt was deleted. This is a from-scratch rebuild.
Visual system: the "Industrial Academic" design language generated via Google
Stitch (full spec at `frontend/design-reference/DESIGN.md` — copy the provided
`industrial_academic/DESIGN.md` file there verbatim, it is the source of truth
for colors/type/spacing, do not re-derive tokens by eyeballing screenshots).
Structural/IA reference: TimetableMaster (competitor product) — sidebar
grouping and page set, NOT its visual style.

8 reference screens with working HTML exist under
`frontend/design-reference/screens/` (copy the Stitch export's per-page
folders there) — treat each `code.html` as a literal visual spec for that
page's look, not just the PNG. Build components by porting the actual markup/
class structure from these files into Ant Design + Tailwind, not by
eyeballing the screenshots and guessing at spacing.

This design system reuses tokens from the project's original abstract
document (`paper`/`paper-raised`/`grid-line`/`accent-soft`/`signal-soft`,
Fraunces/IBM Plex Sans/JetBrains Mono) — this is intentional continuity, not
a coincidence. Treat `DESIGN.md` as canonical; it is more complete and more
specific than anything stated elsewhere in prior planning docs about visual
direction, and supersedes any earlier "neutral black/white theme" guidance.

---

## 1. Sidebar Structure (final)

```
Dashboard
Resources
  ├─ Teachers (Faculty Roster)
  ├─ Rooms (Rooms Management)
  ├─ Subjects (Subject Resources)
  └─ Sections
Timetable                 (the time-grid view)
Canvas View               (ReactFlow relationship graph — separate concept)
Solver Engine             (constraint config + generate)
Version History
Settings
```

`Resources` is a collapsible parent nav group (matches TimetableMaster's
"People"/"Curriculum" grouping pattern) containing four sub-pages. Sections
has no dedicated Stitch screen — build it in the same visual language as
Faculty Roster (table-based, since sections are simple name+size records
without the rich per-item detail that justified cards for Rooms).

A persistent "Generate Schedule" button anchors the bottom of the sidebar
across all pages (visible in every Stitch screenshot) — this is a global
action, not page-scoped, wire it to always navigate to/trigger the Solver
Engine's generate flow regardless of current page.

---

## 2. Backend Schema Additions Required First

These are real Alembic migrations, not frontend-only mocks — do this before
frontend work on the affected pages, since the frontend should call real
fields, not invent local-only ones that vanish on refresh.

### 2.1 — `rooms` table: add `equipment`
```python
equipment: Mapped[list[str]] = mapped_column(JSON, default=list)
```
Stored as a JSON array of short tag strings (e.g. `["Fume Hoods (4)", "Gas
Lines", "Safety Shower"]` per the Rooms Management reference). Update
`RoomSchema` (Pydantic) and the room CRUD route to accept/return this field.

### 2.2 — `subjects` table: add `short_code` and `required_room_type`
```python
short_code: Mapped[str] = mapped_column(String(20), nullable=True)
required_room_type: Mapped[str] = mapped_column(String(50), nullable=True)
```
`short_code` is the institutional course-code style label (e.g. `PHY-101`,
`CS-401`) shown throughout the timetable grid, version history, and subject
list — this is a presentation-critical field, not optional polish, since
every timetable-rendering screen in the reference design uses short codes
instead of full subject names in grid cells. `required_room_type` is a single
value for now (e.g. `"Lab"`, `"Lecture"`, `"Seminar"`) — the Subject
Resources screen shows multiple tags ("Lab, Lecture") which is a stretch goal
(would need a join table); ship single-value first, revisit multi-value only
if time permits.

### 2.3 — Solver awareness of new fields
`required_room_type` should actually feed the CP-SAT model's existing room-
type-compatibility hard constraint (`backend/app/solver/engine.py` already
has logic checking room type against subject — confirm this field is being
read from real data now instead of any placeholder/default it may currently
use, per Phase 1's spec).

### 2.4 — `organizations` table: add `logo_url`
Seen in the Settings screen ("Institutional Emblem" upload). Nullable string,
points to a Supabase Storage signed URL or public asset path (use the
`assets` bucket from `SUPABASE_SETUP.md` Part E, which was specified as
public — appropriate for a logo).

### 2.5 — Solver config fields on `organizations`
The Settings/Engine Configuration screen exposes "Constraint Strictness"
(Relaxed/Balanced/Absolute) and a max execution time. Add:
```python
constraint_strictness: Mapped[str] = mapped_column(String(20), default="balanced")
max_solver_seconds: Mapped[int] = mapped_column(Integer, default=30)
```
**Important correction to the Stitch mock data**: the reference screen shows
a default of `3600` seconds — this contradicts the roadmap's actual Phase 1
spec of a 30-second solver timeout. Default `max_solver_seconds` to `30` in
the schema and clamp the Settings UI's input to a sane max (suggest capping
the UI slider/input at something like 60-90s max) unless/until the solver is
actually re-architected to support long-running async jobs safely (that's a
Redis/worker-queue conversation, explicitly deferred per ROADMAP.md — don't
let a UI mock value imply a backend capability that doesn't exist).

---

## 3. Page-by-Page Build Spec

For each page: port the corresponding Stitch `code.html` structure, wire to
real API endpoints (no mock arrays), use Ant Design components underneath
where it speeds up build time (e.g. `Table`, `Modal`, `Form`, `Slider`) styled
via the DESIGN.md tokens rather than default Ant theme — the visual layer
comes from CSS/tokens, Ant just provides behavior/accessibility plumbing.

### 3.1 — Dashboard
Source: `admin_dashboard_slotforge_unified/code.html`
- Utilization Rate stat: compute from real data — (filled slots / total
  possible slots) on the active published version, not a hardcoded 87.4%.
- Solver Engine Active card: only renders when a job is actually queued/
  running (poll `GET /jobs/{job_id}` per Phase 3's async design — NOTE this
  assumes async job infra exists; if still on synchronous generate per
  current backend state, this card either shows nothing or a simple spinner
  during the blocking request, see Section 5 below for the real discrepancy
  this surfaces).
- Recent Versions: pull from `GET /timetables/versions`, show top 2-3.
- Agents/Resources counts: real counts from teachers+rooms+subjects+sections.

### 3.2 — Resources > Teachers (Faculty Roster)
Source: `faculty_roster_slotforge_unified/code.html`
- Table columns: Name, Department, Load (hrs) with progress bar, Active
  Constraints (tags), Actions.
- "Load (hrs)" = sum of weekly_hours across subjects currently assigned to
  this teacher in the active timetable version, compared against a per-
  teacher max (this max doesn't exist in the schema yet — add
  `max_weekly_hours: Mapped[int]` to the `teachers` table, nullable, used
  for the overload-detection visual only, not yet a hard solver constraint
  unless you want it to be — flag this as a product decision: should
  exceeding max_weekly_hours actually block scheduling, or just visually warn?
  Default to visual-warning-only for now, simpler and matches the "soft
  constraint" mental model already in the data design).
- "Overload" badge: red, shown when load > max.
- Active Constraints tags: pull from the `constraints` table filtered to
  `constraint_type` rows referencing this teacher's id in their payload.

### 3.3 — Resources > Rooms (Rooms Management)
Source: `rooms_management_slotforge_unified/code.html`
- Card grid by default; table view toggle (top right icons in reference) —
  implement both, persist the user's last choice in component state (not
  required to persist across sessions for v1).
- Equipment tags from the new `equipment` field (Section 2.1).
- Maintenance conflict card state (red left-border, "ERR_MAINT_OVERLAP"
  message): this implies a "room maintenance/unavailability" concept that
  doesn't exist in the schema at all yet. For v1, this can be a manual flag
  set via a `maintenance_note: Mapped[str | None]` field on `rooms` (nullable
  text, rendered as the warning banner if non-null) rather than building a
  full maintenance-scheduling system — that's out of scope for now.

### 3.4 — Resources > Subjects (Subject Resources)
Source: `subject_resources_slotforge_unified/code.html`
- Table: Code, Subject Name, Dept, Weekly Periods, Req. Room Type, Status.
- "Status" (READY/DRAFT): this implies subjects themselves can be draft —
  not currently a concept in the schema. Simplify for v1: treat "DRAFT" as
  "missing required fields" (e.g. no `required_room_type` set yet) computed
  client-side, not a real stored status field — avoids adding workflow-state
  complexity to a resource that doesn't need its own publish lifecycle.
- "Import CSV" button: real feature, genuinely useful — bulk-create subjects
  from an uploaded CSV (name, weekly_hours, short_code, dept columns). Build
  as a new backend endpoint `POST /subjects/import-csv` accepting multipart
  form data, parsed server-side (pandas or csv module), validated row-by-row,
  returning a summary of created/skipped rows. This is a real, scoped
  feature add — schedule it after core CRUD pages work, not before.

### 3.5 — Resources > Sections
No Stitch reference screen exists. Build using Faculty Roster's table
pattern (same visual language, simpler data: Name, Size, Actions). Don't
invent new visual patterns here — reuse what's established.

### 3.6 — Timetable (the grid)
Source: `version_history_slotforge_unified/code.html`'s right-side grid panel
(the cleanest grid rendering across all 8 screens) — use this, not the
`timetable_canvas` screen's grid (that one is a draft-state editing view with
conflict markers, save for the Solver Engine generate-review flow instead,
see 3.8).
- Mon-Fri columns with time-slot rows, subject code + room + teacher per cell.
- Section selector (dropdown, per the original `TimetablePage.tsx`'s existing
  "CS-A" selector — keep this UX pattern, just restyle).
- Respect the org's `scheduling_mode` (fixed_weekday vs day_order) — see
  Section 4 below, this requirement from the prior plan still applies
  regardless of visual system chosen.
- Export button (PDF/Excel/CSV) wired to the real Phase 5 export endpoints.

### 3.7 — Canvas View (relationship graph)
Source: none from Stitch — this is your existing ReactFlow-based page,
**restyle only**, don't redesign the interaction model:
- Apply DESIGN.md tokens: replace bright purple/cyan/green/gold node colors
  with the paper/ink/pine palette — section nodes could use `primary-container`
  tint, teacher nodes a neutral surface tint, subject/room nodes using
  `secondary-container` (burnt orange family) sparingly, NOT as heavily
  saturated as the current purple/cyan/green/gold scheme.
- Keep all previously-planned functional improvements from the prior overhaul
  plan: dagre/elkjs auto-layout for scale, click-to-filter highlighting.

### 3.8 — Solver Engine
Source: `solver_engine_slotforge_unified/code.html`
- Left panel: Hard Constraints (display-only list, pulled from
  `constraints` table where `weight IS NULL`, read-only here — actual
  creation/editing of constraint rows happens on a constraints management
  page, this view is a pre-generate review/summary, not a CRUD form).
- Soft constraints: sliders for weight (Low/Medium/High mapped to actual
  integer weight ranges, e.g. 1-3/4-7/8-10) — these DO need to write back to
  the `constraints` table's `weight` column on change.
- "Ready for Execution" footer bar showing live variable/constraint counts —
  compute these from the actual CP-SAT model size right before solving
  (`engine.py` likely already knows `model.Proto().variables` count after
  building — expose this via the generate endpoint's response or a separate
  lightweight "preview model size" endpoint if you don't want to fully solve
  just to show a count).
- Right panel: Solver Job Queue — shows current/recent generate jobs.
  **This explicitly assumes async job tracking.** Current backend (per
  ROADMAP.md) is synchronous-only; Redis/worker is deferred. Decide: either
  (a) keep this panel simple for now — show only the most recent completed
  result, no live "Iteration: 1,402" progress (that data doesn't exist
  without a real async worker reporting interim state), or (b) treat this UI
  as aspirational/Phase-8-adjacent and stub it with a "Coming soon" treatment
  like the reference design did for its AI Engine Analysis panel. Recommend
  (a) — build the honest version now, upgrade visuals later if Redis ever
  gets built.
- UNSAT test run display: this maps directly to the existing
  `infeasible_reason` field already returned by the solver per Phase 1 spec —
  wire it directly, no new backend work needed here.

### 3.9 — Version History
Source: `version_history_slotforge_unified/code.html`
- Vertical branching timeline of versions (draft/published/archived nodes).
  This is the most custom-built component in the whole app — likely needs a
  small bespoke SVG/CSS timeline component (a simple vertical line + dot per
  version, connecting lines, no need for a heavy graph library given it's
  always a single linear sequence per org, not a true branching DAG — despite
  the "branching" look in the mock, actual version history per ROADMAP.md
  Phase 4 is strictly linear: v1, v2, v3... so render it as a simple vertical
  list with connecting lines, not a literal graph layout).
- Recent Activity panel: pulls from `audit_logs` filtered to rows where
  `target_table = 'timetable_versions'` or related, scoped to current org.
- Compare/Export/Promote buttons wired to existing Phase 4/5 endpoints
  (publish, rollback-as-new-version, export).
- Grid panel: reuse the Timetable page's grid component, scoped to whichever
  version is selected in the timeline (not necessarily the published one).

### 3.10 — Settings
Source: `settings_slotforge_unified/code.html`
- Institutional Identity: org name (editable, calls an org-update endpoint —
  check if one exists yet; Phase 3 only specified read access to
  organizations, an update endpoint may need adding), logo upload (wires to
  Supabase Storage `assets` bucket + new `logo_url` field from Section 2.4).
- Solver Parameters: constraint_strictness selector, max_solver_seconds input
  (clamped per the Section 2.5 correction), heuristic depth slider (cosmetic
  for now unless CP-SAT parameters are actually exposed this granularly in
  `engine.py` — check before wiring, don't fake a control that does nothing).
- Event Telemetry checkboxes: these imply a notifications system that doesn't
  exist yet (Phase 8-adjacent, "push notifications" was explicitly deferred
  in ROADMAP.md). Build the UI, store the boolean preferences on the
  `profiles` or `organizations` table, but don't promise they actually
  trigger anything yet — or hide this section until notifications are real.
- "Reset Engine Defaults": real action, resets the strictness/timeout/weights
  to schema defaults — straightforward.

---

## 4. Carried Over From Prior Plan (still valid, visual system change doesn't affect these)

The following sections from the previous frontend plan are **unaffected** by
switching visual systems and should still be executed as originally
specified:

- **Day Order scheduling mode** (organizations.scheduling_mode,
  fixed_weekday vs day_order, cycle_length, merged lab-block cell rendering
  in the Timetable grid) — see prior plan Section 2 in full.
- **Onboarding wizard** (Welcome/skip choice, Institution basics, Rooms,
  Teachers, Subjects, Sections, Constraints steps, re-entry support) — see
  prior plan Section 4 in full. Style the wizard using DESIGN.md tokens
  instead of the neutral black/white theme originally specified — same
  structure, new skin.
- **Real auth + API integration** (replacing `authContext.tsx` mocks with
  real Supabase Auth, JWT attachment via axios interceptor) — see prior plan
  Section 5 in full. This is unchanged and remains the highest-priority
  functional work regardless of visual system — nothing in this rebuild
  matters if it's still rendering against fake local data.

---

## 5. Honest Gaps to Flag Before Building

These are real mismatches between what the reference designs assume and what
the backend currently supports — surface these explicitly, don't silently
build UI that implies functionality that isn't there:

1. **Async job status (Solver Engine's live queue panel)** assumes real-time
   job progress reporting that requires Redis/worker infra, currently
   deferred. Build the honest synchronous version (Section 3.8).
2. **Room maintenance conflicts** imply a scheduling/calendar system for
   room unavailability that doesn't exist — ship as a simple manual flag
   field for v1 (Section 3.3).
3. **Subject draft/ready status** implies a workflow that doesn't need to
   exist — compute client-side instead of adding backend state (Section 3.4).
4. **Notification preferences** (Settings > Event Telemetry) have no backend
   delivery mechanism yet — store preferences, don't fake delivery.
5. **Multi-value room-type requirements** ("Lab, Lecture" as two tags) is a
   join-table-level feature — ship single-value first (Section 2.2).

None of these block starting the rebuild — they're scoping notes so the
agent doesn't either (a) silently skip building the UI element entirely
because the backend doesn't support it, or (b) build a convincing-looking UI
that's secretly wired to nothing. Build the honest, real version of each.

---

## 6. Execution Order

1. Copy `DESIGN.md` + all 8 `code.html` references into
   `frontend/design-reference/` — done once, first.
2. Backend: Section 2 migrations (equipment, short_code, required_room_type,
   logo_url, constraint_strictness, max_solver_seconds, teacher
   max_weekly_hours, room maintenance_note). One migration, run, verify in
   Supabase Table Editor before touching frontend code.
3. Real auth + API wiring (Section 4's carried-over Section 5) — nothing
   else can be honestly tested until this works.
4. Design tokens into the actual app: Tailwind config + Ant ConfigProvider
   reading from DESIGN.md's values (recreate as `design-tokens.json` if
   easier for code to consume than parsing the markdown frontmatter directly).
5. Build pages in this order: Dashboard → Resources (all four sub-pages) →
   Timetable → Solver Engine → Version History → Settings → Canvas View
   (last, since it's a restyle of existing work, lowest risk/effort).
6. Day Order scheduling mode (backend + Timetable grid changes).
7. Onboarding wizard.

Test each page against real backend data before moving to the next — this
was the failure mode last time (per "the AI agent failed miserably") and is
worth stating explicitly: small, verified steps, not one giant unreviewed
pass across the whole frontend.
