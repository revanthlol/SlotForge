# SlotForge Frontend Overhaul — Implementation Plan

## Context for the agent

The existing frontend (built by Shritha) is functionally real, not a placeholder:
working Ant Design CRUD tables, a dashboard with live stat cards, a weekly grid
timetable view, and a ReactFlow-based "Canvas View" showing section→teacher→
subject→room relationships. Auth is currently fully mocked (`authContext.tsx`
fakes login via `localStorage`, no real Supabase calls exist yet).

This plan does NOT ask you to rebuild from scratch. It asks you to:
1. Replace the mocked auth with real Supabase Auth + real backend API calls
2. Rework the visual design system (currently generic dark-admin-dashboard
   look; target is neutral black/white/reverse, restrained, premium-feeling)
3. Fix the timetable data model to support real Indian-college scheduling
   patterns (Day Order rotation), not just fixed Mon-Fri
4. Build a proper onboarding wizard with an explicit skip option at every step
5. Improve Canvas View's visual quality and interaction

Treat existing components as the starting point to edit, not files to discard.

---

## 1. Design System Overhaul

### 1.1 — Visual direction
Current state: dark theme, purple/indigo accent (`#6366f1`-ish), generic
SaaS-admin-template look — this is the thing to move away from.

Target: **neutral black/white, with the light theme as an inverse of the dark
theme** (true reversal — light theme isn't a separate palette, it's the dark
theme's values flipped). No purple/indigo accent color. Restraint over
decoration — fewer gradients, fewer glows, flatter surfaces, more reliance on
typographic hierarchy and whitespace to create structure.

### 1.2 — Token file (create if it doesn't already exist)
Create `frontend/src/theme/design-tokens.json`:
```json
{
  "color": {
    "dark": {
      "background": "#0a0a0a",
      "surface": "#141414",
      "surfaceRaised": "#1c1c1c",
      "border": "#2a2a2a",
      "textPrimary": "#f5f5f5",
      "textSecondary": "#a3a3a3",
      "accent": "#ffffff",
      "success": "#3fb950",
      "warning": "#d29922",
      "danger": "#f85149"
    },
    "light": {
      "background": "#ffffff",
      "surface": "#f5f5f5",
      "surfaceRaised": "#ededed",
      "border": "#d4d4d4",
      "textPrimary": "#0a0a0a",
      "textSecondary": "#5c5c5c",
      "accent": "#0a0a0a",
      "success": "#1a7f37",
      "warning": "#9a6700",
      "danger": "#cf222e"
    }
  },
  "spacing": { "xs": 4, "sm": 8, "md": 16, "lg": 24, "xl": 32, "xxl": 48 },
  "radius": { "sm": 4, "md": 8, "lg": 12 },
  "typography": {
    "fontFamily": "'Inter', -apple-system, sans-serif",
    "fontFamilyMono": "'JetBrains Mono', monospace",
    "h1": 32, "h2": 24, "h3": 18, "body": 14, "caption": 12
  }
}
```
Subject/room/teacher color-tagging (the purple/cyan/green/gold chips visible
in the current Canvas View and Timetable) should move to a SEPARATE small
palette of muted, desaturated tones — these are functional category colors,
not brand colors, and should read as quiet labels, not bright UI accents.
Keep these distinct from the neutral black/white theme tokens above.

### 1.3 — Ant Design ConfigProvider
Update `frontend/src/main.tsx` (or wherever `ConfigProvider` currently lives,
if it exists yet — check first) to consume `design-tokens.json` and support
both light and dark mode via Ant Design v5's `algorithm: theme.darkAlgorithm`
/ `theme.defaultAlgorithm` switch, driven by a real toggle in the UI (not just
hardcoded dark mode as it appears to be now).

### 1.4 — General visual cleanup pass
- Remove the purple/indigo accent (`#6366f1`-style) from buttons, the active
  sidebar item highlight, and the "Generate New" button — replace with the
  neutral palette (white/black accent depending on theme).
- Audit existing components for hardcoded hex colors outside the token file
  and replace with token references — this was a requirement from the
  original roadmap (Phase 6) and should now actually be enforced during this
  pass, not just stated as a rule.
- Sidebar: current icon style is fine structurally, restyle to match neutral
  palette — remove the colored icon backgrounds (the rounded squares behind
  each sidebar icon currently in light purple/teal/etc per page), use a single
  consistent treatment instead (e.g. icon-only with active-state underline or
  background, not per-icon brand colors).

---

## 2. Timetable Data Model — Day Order Support

### 2.1 — The core problem
Current model assumes fixed weekdays (Mon-Fri columns in `TimetablePage.tsx`,
likely a `day: "Mon"|"Tue"...` field in the backend `TimeSlot` model). Real
Indian college timetables often use a **rotating "Day Order"** (I, II, III...
VI) that cycles independently of the actual calendar weekday, so subject hours
stay balanced even across holidays/disruptions (per the reference timetable
provided — note "Day Order I" through "Day Order VI", six cycle days, not
five fixed weekdays, with some columns spanning merged lab blocks).

### 2.2 — Required change: configurable scheduling mode (backend)
This is a backend change, not just frontend — flag for the agent to confirm
both sides get updated:

- Add `scheduling_mode` to the `organizations` table (Alembic migration
  required): enum/text, values `"fixed_weekday"` or `"day_order"`. Default
  `"fixed_weekday"` (matches current behavior, no breaking change for
  existing orgs).
- When `scheduling_mode = "day_order"`, the `TimeSlot` model's `day` field
  represents a cycle position ("Day Order I", "Day Order II", ... up to a
  configurable `cycle_length`, also stored on `organizations`, default 6 to
  match the reference timetable) rather than a literal weekday name.
- The solver (`backend/app/solver/engine.py`) should NOT need structural
  changes — `day` is already just an opaque slot-grouping key in the CP-SAT
  model. Confirm this is true by checking `models.py`'s `TimeSlot` dataclass;
  if `day` is typed/validated as a weekday enum anywhere, loosen it to a
  generic string/label so "Day Order I" is a valid value.
- Org settings UI (new, or added to an existing settings page) needs a toggle
  for this mode, set once during onboarding (Section 4) or changeable later
  in org settings.

### 2.3 — Required change: Timetable grid rendering (frontend)
`TimetablePage.tsx` currently hardcodes Mon-Fri columns. Change to:
- Read the org's `scheduling_mode` from context/API.
- If `fixed_weekday`: render exactly as today (Mon-Fri columns).
- If `day_order`: render columns labeled "Day Order I" through the org's
  configured `cycle_length`, sourced from data, not hardcoded.
- Support **merged/spanning cells** for lab blocks — the reference timetable
  shows e.g. "AJ LAB (MCA LAB)" spanning two hour-columns as one merged cell,
  and "MAD LAB (CLOUD LAB)" similarly. Current grid implementation should be
  checked for whether it already supports multi-slot-span rendering; if each
  cell is rendered as a fixed 1-hour box independently, this needs a colspan-
  style change (a lab `Subject` already has `weekly_hours`, and a Section's
  scheduled block for that subject may legitimately occupy 2+ contiguous
  slots — the grid should visually merge those instead of showing duplicate
  adjacent cells).
- Add a faculty/legend table below the grid (visible in the reference image
  as "FACULTY NAMES" with Name / Course / Shorthand / Total Hours columns) —
  this is a nice, cheap addition that matches real institutional timetable
  conventions and reads as more "premium/real" than a bare grid.

---

## 3. Canvas View Improvements

Current state (per screenshot): ReactFlow graph, 4-tier layout (Section →
Teacher → Subject → Room), color-coded by tier, working drag-to-rearrange,
minimap present. This is a good foundation — improvements, not a rebuild:

- **Visual restraint pass**: apply the neutral token palette from Section 1;
  remove the bright purple/cyan/green/gold node-tag colors in favor of the
  new muted functional-color set. Keep color-coding by tier (it's genuinely
  useful for reading the graph), just desaturate.
- **Edge legibility**: current edges are thin colored lines on a dark
  background — increase contrast or add subtle directional arrows so the
  flow direction (Section → Teacher → Subject → Room) reads clearly without
  needing the legend.
- **Node density at scale**: current demo data is small (3 teachers, 4
  subjects, 3 rooms). Before considering this "done," test with a larger
  fixture (e.g. 12 teachers, 24 subjects per the dashboard's own stat cards
  showing those numbers already exist) and confirm the layout algorithm
  (whatever ReactFlow layout is in use, likely manual or a basic auto-layout)
  doesn't produce an unreadable tangle. If it does, integrate `dagre` or
  `elkjs` for proper auto-layout — both are standard ReactFlow companions for
  this exact problem and worth adding as a dependency if not already handled.
- **Click-to-filter**: clicking a node should highlight only its connected
  edges/nodes and dim the rest — this is a common, cheap-to-implement
  improvement for relationship graphs and makes the view usable at real scale
  instead of just at demo scale.

---

## 4. Onboarding Wizard

### 4.1 — Principle
Fully optional at every step. A new org can either: (a) walk through guided
setup with sensible defaults pre-filled, or (b) skip straight to an empty
dashboard and add everything ad-hoc later, exactly as today. No step should
be a hard gate — "skip for now" must be a visible, equally-weighted option
next to "continue," not a buried link.

### 4.2 — Flow (replaces today's "signup → empty dashboard" with "signup →
optional wizard → dashboard")

After successful signup (real Supabase Auth + `/auth/signup-organization`,
see Section 5), show a wizard with these steps. Use Ant Design's `Steps`
component (already imports cleanly from `antd`, no new dependency needed) as
the step indicator.

**Step 0 — Welcome / choice**
"Set up your institution now, or explore with sample data first?" Three
options, not two:
  - "Guided setup" → proceeds to Step 1
  - "Skip — start empty" → goes straight to dashboard, no resources created
  - "Skip — load sample data" → seeds the same kind of demo data currently
    hardcoded in the mocked frontend (3 teachers, a few rooms/subjects/
    sections) via real API calls, then goes to dashboard — this preserves the
    "looks good immediately" demo value the current mock data provides, while
    making it real, persisted, org-scoped data instead of fake local state.

**Step 1 — Institution basics**
- Org name (likely already set during signup — pre-fill, allow edit)
- Scheduling mode: `fixed_weekday` vs `day_order` (Section 2.2) — explain
  briefly what each means with the actual reference example, e.g. "Day Order
  rotates through a fixed cycle regardless of holidays — common in colleges
  with lab-heavy schedules" vs "Standard Monday-Friday week."
- If `day_order` chosen: cycle length input (default 6).
- "Skip this step" always visible — falls back to `fixed_weekday` default.

**Step 2 — Rooms**
- Inline-add form (name, capacity, room_type) with an Ant Design editable
  table pattern — add multiple rows before submitting, not one room per page
  load. "Add another room" button, "Continue" / "Skip for now" at the bottom.

**Step 3 — Teachers**
- Same inline-multi-add pattern. Fields: name, email, department (free text
  for now), subjects taught (multi-select, populated from Step 4 if subjects
  already exist, otherwise allow free-text entry now and reconcile later —
  don't force a strict order dependency between teachers and subjects, since
  real users may want to enter either first).

**Step 4 — Subjects**
- Inline-multi-add. Fields: name, weekly_hours, optionally a shorthand code
  (per the reference timetable's "AJ", "BD", "MAD" style codes — add a new
  optional `short_code` field to the `subjects` table via migration if useful
  for the legend table from Section 2.3).

**Step 5 — Sections**
- Inline-multi-add. Fields: name, size.

**Step 6 — Constraints (optional, clearly marked as advanced)**
- This step should default-collapse to "skip" — most users in a first setup
  won't have constraints ready yet. Show it as available but de-emphasized
  ("Most institutions skip this initially and add constraints later from the
  Constraints page").

**Final step — Done**
- Summary of what was created, "Go to Dashboard" button, and optionally a
  "Generate your first timetable now" call-to-action if enough data exists
  (at least 1 of each: room, teacher, subject, section).

### 4.3 — Re-entry
A user who skipped should be able to relaunch the wizard later (e.g. a
"Setup Wizard" link in org settings or an empty-state prompt on the dashboard
if core resources are still at 0) — don't make skipping a one-way door away
from the guided experience.

---

## 5. Real Auth + API Integration (replaces current mocks)

This is the highest-priority functional fix, since right now NONE of the
frontend is actually wired to the real backend — flag clearly to the agent
that this is not optional polish, it's the difference between a demo and a
working product.

### 5.1 — Replace `authContext.tsx`
- Remove `MOCK_USER`, the `localStorage`-based session, and the artificial
  `setTimeout` delays.
- Use `@supabase/supabase-js` (add as a dependency if not already present —
  check `package.json`, it currently is NOT listed, despite `authContext.tsx`
  referencing Supabase in comments).
- `loginWithEmail` → `supabase.auth.signInWithPassword({ email, password })`
- Real signup goes through the backend's `POST /auth/signup-organization`
  (NOT directly through Supabase client signup, since that endpoint also
  creates the `organizations` + `profiles` rows atomically — calling Supabase
  signup directly would skip that and leave an orphaned auth user).
- Session persistence: let Supabase's client handle this natively (it manages
  its own storage/refresh internally) — don't hand-roll `localStorage` logic
  for this anymore.
- `loginWithGoogle` → real Supabase OAuth flow (`supabase.auth.signInWithOAuth
  ({ provider: 'google' })`) if Google OAuth provider is enabled on the
  Supabase project (confirm this was actually enabled per `SUPABASE_SETUP.md`
  Part D.1 — if not, either enable it or remove the Google login button until
  it is, don't leave a button that fails silently).

### 5.2 — Attach real JWT to API calls
- `frontend/src/api/client.ts` needs an interceptor (axios supports this
  natively) that reads the current Supabase session token and attaches
  `Authorization: Bearer <token>` to every outgoing request to the FastAPI
  backend.
- Confirm `VITE_API_BASE_URL` env var exists and points at the correct
  backend (dev VPS URL in dev, prod VPS URL in prod — per the existing
  `DEPLOYMENT_GUIDE.md` environment split).

### 5.3 — Replace any remaining mock data in CRUD pages
- Audit `TeachersPage.tsx`, `RoomsPage.tsx`, `SubjectsPage.tsx`,
  `SectionPage.tsx`, `ConstraintsPage.tsx` for hardcoded/local mock arrays —
  given auth was fully mocked, it's likely these pages were also built
  against local fixture data rather than `useApi.ts`/`endpoints.ts` calls.
  Confirm each page's data source and wire to the real backend API if not
  already connected.

---

## 6. Execution Order (for the agent)

Do NOT attempt all of this in one pass. Suggested order, each step should be
independently testable before moving to the next:

1. Section 5 (real auth + API wiring) — until this works, nothing else can be
   genuinely tested against real data, so it unblocks everything after it.
2. Section 1 (design tokens + visual cleanup) — purely visual, low risk,
   immediately makes the whole app look more intentional regardless of what
   else changes.
3. Section 2 (Day Order timetable model) — backend migration first, then
   frontend grid rendering changes.
4. Section 4 (onboarding wizard) — depends on Section 5 being done (needs
   real signup/API to create real resources during the wizard).
5. Section 3 (Canvas View polish) — lowest priority, already functional,
   purely a quality pass.

After each numbered section, run the existing test suite (`pytest` for any
backend changes) and manually click through the affected pages before moving
on — don't batch all five sections into one untested commit.
