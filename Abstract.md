# SlotForge - Project Abstract

> **Domain:** Operations Research, Constraint Satisfaction, Institutional Timetabling  
> **Category:** Academic Mini Project  
> **Project Type:** Full-stack scheduling and resource optimisation platform

---

## Abstract

SlotForge is a web-based institutional timetabling platform designed to automate the construction, validation, editing, and publication of academic schedules. Manual timetable creation requires repeated trial-and-error coordination between sections, teachers, subjects, rooms, weekly hour requirements, lab blocks, and institutional rules. As the number of resources increases, the scheduling space becomes combinatorial, making manual approaches slow, error-prone, and difficult to revise when a constraint changes.

The system models timetable generation as a Constraint Satisfaction and Constraint Optimisation problem. It uses Google OR-Tools CP-SAT to assign subjects, teachers, rooms, sections, days, and periods while enforcing hard constraints such as teacher non-overlap, room non-overlap, section non-overlap, room capacity, teacher availability, configured weekly subject hours, and multi-period lab sessions. The solver also supports soft optimisation goals including teacher gap reduction, daily load balancing, resource utilisation, and preference satisfaction. When a timetable cannot be generated, SlotForge reports meaningful infeasibility causes such as insufficient weekly slots, room-time capacity, teacher-time capacity, room mismatch, missing teacher qualification, or unavailable legal start periods.

SlotForge supports both fixed weekday scheduling and day-order scheduling. Administrators can configure cycle length, periods per day, resource records, section sizes, teacher-subject qualifications, and section-specific subject mappings. Section-subject mapping ensures that a subject is generated only for the sections that actually take it, preventing subjects from being incorrectly assigned to unrelated sections. A section may use a qualified teacher pool or a fixed teacher for a specific subject.

The platform provides a complete administrative interface for resource management. Teachers, rooms, subjects, and sections can be created, edited, searched, deleted, and assigned through structured forms. Subjects include weekly periods, session length, teacher qualification mappings, and customizable color coding. The same saved subject color is used consistently across the subject resources table, timetable grid, all-class list, and canvas relationship view, making schedules easier to read and visually distinguish.

Generated timetables are stored as immutable versions. Each generation creates a draft version with scores and slot assignments. Administrators can review generated versions, publish a selected timetable, archive older published versions, roll back previous versions by creating a new copy, and inspect version history without overwriting prior records. Timetable slots can also be edited manually in draft versions through drag-and-drop movement, duration changes, deletion, and manual class insertion, while the backend validates slot-span limits and prevents section, teacher, or room conflicts.

The web application includes multiple timetable views. The main timetable page provides section, teacher, and room perspectives, with board and list modes. The canvas view visualizes scheduling relationships between sections, subjects, teachers, and rooms using a color-coded graph driven by the same subject palette used in the timetable. Selecting a node isolates its connected resources and displays related generated assignments. The version history page gives administrators a structured way to inspect previous timetable versions and scheduling outcomes.

SlotForge includes a guided onboarding workflow for new organizations. The setup guide walks administrators through institution settings, teacher creation, room creation, subject configuration, section creation, curriculum mapping, and solver execution. The platform also supports multiple organizations per user through organization memberships. Users can create a new organization, switch between organizations, and maintain separate resources, timetables, versions, and setup state for each organization.

The backend is implemented with FastAPI, SQLAlchemy, Alembic, Pydantic, PostgreSQL, and Supabase Auth. Every tenant-scoped table is associated with an organization, and API queries are filtered by the authenticated user's active organization. Role-based access control separates administrative write access from read-only access. Mutating operations are recorded in an audit log with actor, target table, target record, and structured change data. Export functionality supports PDF, Excel, and CSV timetable outputs for offline distribution.

The frontend is implemented with React, TypeScript, Vite, Tailwind CSS, Headless UI, React Router, Axios, and Supabase client libraries. The interface uses a Material-inspired visual system with Roboto Flex, Google Sans/Product Sans fallbacks, Material Symbols, responsive layouts, keyboard shortcuts, modal workflows, theme support, and readable timetable card typography. The result is a practical scheduling system that combines operations research, backend validation, multi-tenant data modelling, and an interactive user interface for real institutional timetable management.

---

## Keywords

Constraint Satisfaction Problem, Constraint Optimisation, CP-SAT, Google OR-Tools, Timetable Scheduling, Academic Resource Allocation, Multi-Tenant SaaS, FastAPI, PostgreSQL, Supabase, SQLAlchemy, Alembic, React, TypeScript, Vite, Tailwind CSS

---

## Core Features

| Area | Features |
|---|---|
| Solver Engine | Google OR-Tools CP-SAT scheduling, hard constraints, soft scoring, lab-block sessions, fixed weekday and day-order cycles, infeasibility diagnostics |
| Resource Management | Teachers, rooms, subjects, sections, room capacities, subject weekly hours, session lengths, teacher-subject qualifications |
| Curriculum Mapping | Section-specific subject inclusion, optional fixed teacher per section-subject pair, prevention of irrelevant subjects appearing in generated section timetables |
| Timetable Views | Section/teacher/room views, board layout, all-classes list, color-coded timetable cards, draft slot editing, manual class insertion |
| Subject Color System | Preset color palette, custom color picker, consistent subject colors across resources, timetable, all-class list, and canvas graph |
| Canvas View | Interactive relationship graph linking sections, subjects, teachers, and rooms with focus mode, version selector, graph summary, legend, and selected-node details |
| Versioning | Draft versions, publishing, archiving, rollback by copy, version history, stored solver scores |
| Onboarding | Guided setup checklist for institution settings, resources, curriculum mapping, and solver generation |
| Multi-Organization Support | Organization memberships, active organization switching, new organization creation, separate resources and timetable versions per organization |
| Security and Audit | Supabase JWT authentication, organization-scoped queries, role-based access control, audit log for mutating actions |
| Exports | Server-side PDF, Excel, and CSV timetable exports |
| User Experience | Responsive admin interface, Material-style icons, improved timetable font sizing, keyboard shortcuts, modal workflows, light/dark theme support |

---

## Technology Stack

### Backend

| Layer | Technology |
|---|---|
| Language | Python 3.12 |
| API Framework | FastAPI |
| Validation | Pydantic |
| Solver | Google OR-Tools CP-SAT |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Database | PostgreSQL via Supabase |
| Authentication | Supabase Auth with JWT verification |
| Export Libraries | ReportLab for PDF, OpenPyXL for Excel, Python CSV module |
| Testing | Pytest, FastAPI TestClient |

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS 4, custom design tokens, responsive CSS |
| UI Utilities | Headless UI, Material Symbols |
| Routing | React Router |
| HTTP Client | Axios |
| Auth Client | Supabase JavaScript client |
| Typography | Roboto Flex, Google Sans/Product Sans fallback, Fraunces display font, JetBrains Mono |
| Quality Checks | TypeScript build, Oxlint |

### Data Model and Architecture

| Concern | Implementation |
|---|---|
| Tenant Isolation | Organization-scoped tables and authenticated active organization filtering |
| Multi-Organization Access | Organization membership table and active organization switching |
| Version History | Immutable timetable versions with draft, published, and archived states |
| Assignment Rules | Teacher-subject assignment rows and section-subject-teacher assignment rows |
| Auditability | Append-only audit logs for mutating actions |
| Deployment Shape | React frontend suitable for Vercel deployment; FastAPI backend suitable for VPS/API hosting; Supabase for PostgreSQL/Auth/Storage |

---

## System Overview

```text
React + TypeScript Admin UI
        |
        | HTTPS / REST / JWT
        v
FastAPI Backend
        |
        | SQLAlchemy ORM + Alembic migrations
        v
Supabase PostgreSQL
        |
        | Resource data, constraints, assignments, versions, audit logs
        v
Google OR-Tools CP-SAT Solver
        |
        | Feasible timetable or infeasibility reason
        v
Versioned timetable output
        |
        | Review, edit, publish, rollback, export
        v
PDF / Excel / CSV + interactive timetable and canvas views
```

---

## Engineering Significance

SlotForge is non-trivial because it combines a formal optimisation engine with a real multi-tenant application architecture. The solver does not simply place classes into empty cells; it must satisfy multiple resource constraints simultaneously, support configurable scheduling cycles, handle lab durations, respect section-specific curriculum mappings, and produce useful diagnostics when no solution exists. The application layer then turns solver output into versioned, editable, auditable, exportable timetable records. The frontend provides multiple operational views over the same data, including a color-coded timetable and relationship canvas, making the solver's output understandable to administrators who may not have technical knowledge of constraint programming.

---

*SlotForge - Operations Research Mini Project*
