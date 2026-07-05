# Phase 3 — Obsidian-style Onboarding Flow

**Agent:** Codex  
**Depends on:** Phase 0 (backend schema), Phase 2 (frontend structure)  
**Blocks:** Phase 5 (Faculty Timetable relies on workspace being set up)  
**Estimated effort:** Medium (2–3 days)

---

## Goal

Replace the current "links in a sidebar" onboarding with a **real, guided,
domain-aware onboarding flow**. The feel should be like **Linear's onboarding**
or **Obsidian's setup wizard** — smooth transitions between steps, no hard
page reloads, progress saved per step, and the flow changes based on which
domain preset the user chooses.

This is the **first "wow" experience** of SlotForge 2.0.

---

## When Onboarding Triggers

- New user signs up → auto-redirect to onboarding
- Existing user creates a new workspace → onboarding for that workspace
- User can re-enter onboarding from Settings → "Setup Wizard"

---

## Global Step Flow (All Presets)

```
Step 1: Create / Name Your Organization
Step 2: Create a Workspace
Step 3: Choose a Domain Preset  ← this determines what comes next
Step 4: Configure Time Structure (time grid / periods / shifts)
Step 5: Add Resources (Teachers / Employees / Speakers / etc.)
Step 6: Add Tasks (Subjects / Shifts / Sessions / etc.)
Step 7: Add Groups (Sections / Departments / Teams / etc.)
Step 8: Add Locations (Rooms / Halls / Labs / etc.)
Step 9: Define Constraints (select from default templates)
Step 10: Preflight Check (conflict warnings before generating)
Step 11: Generate First Schedule
```

---

## Per-Preset Flow After Step 3

### Academic Timetable
```
Organization → Academic Timetable
→ Configure Periods (days × periods per day)
→ Add Teachers (name, subject expertise, availability)
→ Add Subjects (name, weekly hours, lab/theory flag)
→ Add Sections (name, size, enable section-room split?)
→ Add Rooms + Labs (capacity, type)
→ Select Default Constraints
→ Preflight Conflict Check
→ Generate Timetable
```

### Staff Roster
```
Organization → Staff Roster
→ Configure Shift Blocks (shift names, times, days)
→ Add Employees (name, role, availability)
→ Add Departments
→ Set Coverage Requirements per Shift
→ Select Default Constraints
→ Preflight Check
→ Generate Roster
```

### Event Scheduling
```
Organization → Event Scheduling
→ Configure Time Blocks (event dates, session slots)
→ Add Speakers (name, topic, availability)
→ Add Sessions (name, duration, topic)
→ Add Halls (name, capacity, equipment)
→ Add Volunteers (optional)
→ Select Constraints (no speaker clash, etc.)
→ Preflight Check
→ Generate Event Schedule
```

### Exam Scheduling
```
Organization → Exam Scheduling
→ Configure Exam Slots (dates, time blocks)
→ Add Courses (name, student count)
→ Add Halls (capacity, accessibility)
→ Add Invigilators
→ Set Constraints (no student clash, hall capacity)
→ Preflight Check
→ Generate Exam Schedule
```

### Facility / Room Booking
```
Organization → Facility Booking
→ Configure Time Slots (business hours, days)
→ Add Rooms / Facilities (name, capacity, equipment)
→ Add Users / Requesters
→ Set Booking Rules (max duration, advance notice)
→ Preflight Check
→ Go to Booking Dashboard
```

---

## UI Behaviour

### Layout
- Full-screen overlay on top of app shell (not a separate route)
- Left side: step progress tracker (numbered list, current step highlighted)
- Right side: step content with smooth `motion` transitions
- Top-right: "Skip onboarding" link (only shown after Step 3)

### Transitions
```tsx
// Use motion/framer-motion for step transitions
<motion.div
  key={currentStep}
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -20 }}
  transition={{ duration: 0.25, ease: "easeInOut" }}
>
  <StepContent step={currentStep} />
</motion.div>
```

### Progress Saving
- Each completed step is saved via API immediately
- User can close browser, come back, and resume from where they left off
- Backend: `OnboardingProgress` model tracks current step per workspace

### Step Validation
- Each step has a "Continue" button that validates inputs before proceeding
- Errors shown inline (React Hook Form + Zod)
- "Back" button always available

---

## Backend Endpoints Needed (tell Antigravity)

```
GET  /api/v1/workspaces/{id}/onboarding/progress
PUT  /api/v1/workspaces/{id}/onboarding/progress
     body: { current_step: number, completed_steps: string[] }
GET  /api/v1/presets/              → list all 5 presets with descriptions
GET  /api/v1/presets/{key}/config  → preset config (resource types, task types, etc.)
POST /api/v1/workspaces/{id}/preflight-check
     → returns: { feasible: bool, warnings: [{ type, message, severity }] }
```

---

## Preflight Conflict Check (Step 10)

Before the user generates their first schedule, run a quick feasibility check:

```
Checking your setup...
✓ 12 teachers added
✓ 8 subjects configured
✓ 4 sections defined (120 students each)
⚠ Warning: Lab 1 is needed for 18 periods, but only 12 valid slots exist
⚠ Warning: Dr. Smith is unavailable on Tuesdays, but has 4 subjects requiring Tuesday slots
✓ All room capacities sufficient for section sizes
```

This uses the same backend logic as the Heatmap (Phase 7), just surfaced earlier.

---

## Components to Build

```
features/onboarding/
├── OnboardingOverlay.tsx      # full-screen container
├── StepProgress.tsx           # left-side step list
├── StepTransition.tsx         # motion wrapper
├── PresetPicker.tsx           # Step 3 — choose domain
├── TimeGridBuilder.tsx        # Step 4 — configure periods/shifts
├── ResourceAdder.tsx          # Step 5 — add resources (generic)
├── TaskAdder.tsx              # Step 6 — add tasks
├── GroupAdder.tsx             # Step 7 — add groups
├── LocationAdder.tsx          # Step 8 — add locations
├── ConstraintSelector.tsx     # Step 9 — pick default constraints
├── PreflightCheck.tsx         # Step 10 — feasibility display
└── hooks/
    └── useOnboardingProgress.ts
```

---

## Done Criteria

- [ ] Onboarding triggers for new users and new workspaces
- [ ] Step transitions are smooth (motion animations)
- [ ] Domain preset selection (Step 3) changes the subsequent steps
- [ ] Section-room split toggle in Academic preset (Step 7)
- [ ] Progress is saved per step to the backend
- [ ] User can resume onboarding after closing browser
- [ ] Preflight check runs and shows warnings/errors
- [ ] All 5 preset flows are implemented
- [ ] "Skip onboarding" works and marks onboarding as complete
