# SlotForge UML v2 — faculty review script

This script follows the current v2 diagrams. Keep the explanation conceptual, then point out the real implementation names where useful.

## 1. Use-case diagram

SlotForge has two audience roles in this presentation: the institution administrator and the faculty member.

The administrator sets up an Academic workspace; manages faculty, subjects, sections, rooms, and time; records teaching responsibility; configures constraints; generates and inspects a timetable; manages versions; exports results; and creates faculty share links.

Faculty use a view-only share link to see their personal timetable. The four other preset cards are a visible roadmap and are locked until their end-to-end workflows are ready.

## 2. Activity diagram

The administrator signs in on desktop, enters the academic inputs and assignments, chooses constraints, and runs preflight. If required information is missing, SlotForge directs the administrator back to the relevant inputs.

The CP-SAT solver then returns either a feasible draft or an infeasibility explanation. A feasible draft can be inspected, compared, edited, published, shared, and exported. An infeasible result identifies pressure or conflicts so the inputs or rules can be adjusted before another run.

## 3. Class diagram

The class diagram uses the academic words visible in the product: Teacher, Subject, Section, and Room. Internally, these are specialized views of generic Resource, Task, Group, and Location records, which lets one solver model represent the scheduling problem consistently.

An Organization contains workspaces and connects profiles through memberships. A workspace owns its inputs, constraint rules, and schedule runs. A successful run can produce timetable versions; each version contains assignments that connect a teacher, subject, optional section, room, and time.

The Scheduler applies constraints and records either assignments or conflict information. The ExportService reads a timetable version to create downloadable formats.

## 4. Entity-relationship diagram

This is a selective view of the real PostgreSQL schema. `profiles.id` corresponds to the UUID issued by Supabase Auth. `organization_memberships` records which profile belongs to which organization and with what application role.

The scheduling core uses `scheduling_workspaces`, `resources`, `tasks`, `groups`, `locations`, `timeslots`, and `constraint_rules`. `schedule_runs` records solver attempts. `schedule_versions` records the timetable lifecycle and parent version. `assignments` stores the actual placements. `faculty_share_links` creates revocable view-only access.

The full public schema contains 20 application tables and is available in `docs/database/schema.sql`; this diagram keeps only the relationships that are useful in a faculty presentation.

## 5. Sequence diagram

The React frontend signs the administrator in through Supabase Auth and receives an access token. When the administrator requests generation, the frontend sends that token to FastAPI.

FastAPI verifies the token, checks organization membership, and loads the workspace data from PostgreSQL. It builds the CP-SAT problem and asks OR-Tools to solve it. A feasible result is saved as a run, version, and set of assignments. An infeasible result is saved as a failed run and returned with a conflict explanation.

## 6. Deployment diagram

The browser loads the React/Vite frontend from Vercel. Supabase provides authentication and PostgreSQL. The FastAPI application and OR-Tools solver run on an Oracle Cloud VPS.

The browser authenticates directly with Supabase Auth, then calls FastAPI over HTTPS with the bearer token. FastAPI verifies identity and controls tenant-scoped database access. Timetable files are generated in the frontend from the selected version, while faculty share links are backed by the API and database.

This separation keeps the public web interface fast, the solver and authorization logic server-side, and the data model inspectable through the open-source repository.
