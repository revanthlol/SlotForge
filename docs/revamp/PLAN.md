# SlotForge 2.0 — Master Revamp Plan

> **SlotForge is a domain-adaptive scheduling platform that uses constraint solving,
> explainable conflict analysis, and version-controlled schedule workflows to manage
> complex resource-time allocation.**

---

## Overview

This document is the **single source of truth** for the SlotForge 2.0 revamp.
Every phase has its own dedicated markdown file. This file tells you:

- What each phase does
- Which agent executes it
- What the output is
- Whether it blocks other phases

Two coding agents are available:
- **Antigravity** — Google Antigravity (Gemini + limited Claude). Best for backend, solver, schema work.
- **Codex** — ChatGPT Codex. Best for frontend, UI, React, TypeScript work.

Phases are designed to be **as independent as possible** so both agents can work without blocking each other.

---

## Phase Map

| Phase | File | Title | Agent | Blocks |
|-------|------|--------|-------|--------|
| 0 | [phase-0-schema-refactor.md](./phase-0-schema-refactor.md) | Generic Backend Schema Refactor | Antigravity | All phases |
| 1 | [phase-1-academic-preset-fix.md](./phase-1-academic-preset-fix.md) | Academic Preset + Section-Room Feature | Antigravity | Phase 3, 5 |
| 2 | [phase-2-ui-restructure.md](./phase-2-ui-restructure.md) | Frontend Restructure + Design System | Codex | All frontend phases |
| 3 | [phase-3-onboarding.md](./phase-3-onboarding.md) | Obsidian-style Onboarding Flow | Codex | Phase 5 |
| 4 | [phase-4-domain-presets.md](./phase-4-domain-presets.md) | 5 Domain Presets (Full In-Depth) | Antigravity + Codex | Phase 5 |
| 5 | [phase-5-faculty-timetable.md](./phase-5-faculty-timetable.md) | Faculty Timetable + Shareable Links | Codex | — |
| 6 | [phase-6-exports.md](./phase-6-exports.md) | Full Export System (HTML/PDF/Excel/Docs/iCal) | Codex | — |
| 7 | [phase-7-heatmap-explainability.md](./phase-7-heatmap-explainability.md) | Conflict Heatmap + Explainable Scheduling | Antigravity | Phase 8 |
| 8 | [phase-8-constraint-playground.md](./phase-8-constraint-playground.md) | Constraint Playground (Rule Templates) | Antigravity + Codex | — |
| 9 | [phase-9-version-control.md](./phase-9-version-control.md) | Git-like Version Control (Compare/Branch/Publish) | Antigravity + Codex | — |
| 10 | [phase-10-multi-user.md](./phase-10-multi-user.md) | Multi-user RBAC (Admin / Editor / Viewer) | Antigravity + Codex | — |
| 11 | [phase-11-canvas-map.md](./phase-11-canvas-map.md) | Canvas Map (React Flow — Resource/Conflict/Version Graph) | Codex | — |
| 12 | [phase-12-ui-polish.md](./phase-12-ui-polish.md) | UI Polish — Motion Animations, Typography, Mobile | Codex | — |

---

## Dependency Graph

```
Phase 0 (Schema)
  ├── Phase 1 (Academic Fix)
  │     └── Phase 3 (Onboarding) → Phase 5 (Faculty)
  ├── Phase 2 (UI Restructure) → Phase 3, 5, 6, 11, 12
  ├── Phase 4 (Domain Presets) → Phase 5, 8
  ├── Phase 7 (Heatmap) → Phase 8 (Constraint Playground)
  ├── Phase 9 (Version Control)
  └── Phase 10 (Multi-user)
```

---

## Parallel Work Opportunities

These pairs can be worked on simultaneously after their dependencies are met:

| Codex (Frontend) | Antigravity (Backend) |
|---|---|
| Phase 2 — UI Restructure | Phase 0 — Schema Refactor |
| Phase 3 — Onboarding | Phase 1 — Academic preset |
| Phase 6 — Exports | Phase 7 — Heatmap backend |
| Phase 11 — Canvas Map | Phase 8 — Constraint Playground backend |
| Phase 12 — UI Polish | Phase 10 — Multi-user backend |

---

## Feature Pillars → Phases Mapping

| Pillar | Phases |
|--------|--------|
| **Domain Layer** | Phase 0, 1, 4 |
| **Rule / Constraint Layer** | Phase 8 |
| **Insight Layer** | Phase 7 |
| **Lifecycle Layer** | Phase 9 |
| **Interface Layer** | Phase 2, 3, 11, 12 |
| **Faculty Timetable** | Phase 5 |
| **Exports** | Phase 6 |
| **Multi-user** | Phase 10 |

---

## Must-Have vs Stretch

### Must-Have (Ship These)
- Phase 0 — Schema Refactor
- Phase 1 — Academic Preset + Section-Room
- Phase 2 — UI Restructure
- Phase 3 — Onboarding
- Phase 4 — Domain Presets (5 presets)
- Phase 5 — Faculty Timetable
- Phase 6 — Exports
- Phase 7 — Heatmap + Explainability
- Phase 8 — Constraint Playground
- Phase 9 — Version Control

### Stretch Goals (Do After Core)
- Phase 10 — Multi-user RBAC
- Phase 11 — Canvas Map
- Phase 12 — UI Polish / Animations

---

## Key Architecture Decisions Locked

1. **Full generic backend refactor** — Teacher → Resource, Class → Task, Period → TimeSlot
2. **Faculty timetable** — admin view per faculty + public shareable link (no faculty login)
3. **Multi-user** — Admin / Editor / Viewer RBAC (its own phase, after schema stable)
4. **5 presets** — Academic, Staff Roster, Event Scheduling, Exam Scheduling, Facility/Room Booking
5. **Section-room split** — One section can be split into multiple classrooms per period (Academic preset)
6. **All exports** — HTML, PDF, Excel/CSV, Google Docs, Word/DOCX, iCal
7. **Frontend structure** — Restructure from pages/ to features/ (Phase 2)
8. **Onboarding** — Transition-based, Obsidian/Linear-feel, domain-aware steps
9. **Constraint Playground** — Rule template JSON → compiler → solver (no custom scripting language)
10. **Heatmap** — Real data from solver (pre-gen pressure + post-gen violation view)
