# Context Changelog

## 2026-07-26

- Isolated every backend pytest session in a disposable Docker PostgreSQL container before application imports. Added fail-closed URL checks that reject remote hosts, non-test database names, and non-PostgreSQL targets, preventing test cleanup from ever reaching the configured Supabase database.
- Added idempotent application account completion for verified Supabase identities, preserving existing profiles and ignoring user-editable OAuth role metadata.
- Added Google and GitHub sign-in controls, an OAuth callback route, and a first-time institution completion flow. Missing application profiles now keep their valid Supabase session instead of being automatically signed out.
- Documented the exact Google/GitHub provider callback and SlotForge redirect allow-list configuration. Supabase remains the single identity authority; no Firebase identity split was introduced.
- Verification passed with `61` backend tests in disposable Docker PostgreSQL, a successful frontend production build, zero frontend lint errors, and browser smoke coverage for both OAuth controls. Release `0d6368c` was pushed to `dev` and fast-forwarded onto Oracle; dependencies were synchronized, no migration was pending, `slotforge-api.service` restarted active, `/health` and `/health/db` returned HTTP 200 at Alembic `c7d4e5f6a7b8`, the new `/auth/complete-account` route appeared in production OpenAPI, and the recent error-level journal was empty.

- Unified the landing, login, signup, open-source, privacy, terms, and contact pages around the same floating public navbar; removed the separate three-button auth switcher and added contextual sign-in/create-institution actions.
- Gave GitHub a dedicated logo button, added explicit external-link arrows to GitHub and Contribute in the shared footer, and added `/landing` plus route-safe landing section links.
- Added route scroll restoration, public-page entry motion and a reduced-motion-aware progress treatment. The open-source page now links and displays the complete MIT License.
- Reworked Canvas into a full-bleed, theme-aware scheduling instrument that uses the application light palette in light mode while preserving dark-theme compatibility and all graph interactions.
- Replaced the landing timetable card with a desktop solver-trace animation and static mobile result; updated the product thesis, launch chooser, navigation, open-source proof, GitHub links, and footer.
- Added shared auth navigation, gated login/signup/onboarding on mobile, and retained public access to the landing, policy, open-source, contact, and faculty share routes.
- Locked staff roster, event, exam, and facility presets as coming soon in Settings and onboarding; Academic remains the supported workflow, with recovery for legacy preview workspaces.
- Added MIT licensing, contributor/conduct/security guides, issue templates, public project/legal/contact pages, a current docs index, and a schema-only PostgreSQL export covering the 20 application tables.
- Removed completed phase plans, chat logs, duplicate HTML exports, and UML v1; preserved valuable research under `docs/archive/research` and retained/corrected UML v2 for faculty presentations.
- Verification: frontend production build passed; Oxlint completed with the three existing context-only Fast Refresh warnings; backend suite passed `54 passed`; all six PlantUML v2 sources validated and rendered; the schema-only dump restored with 21 public tables and 52 foreign keys; 16 current Markdown files passed the relative-link check.
- Authenticated browser verification passed the light full-bleed Canvas, selection inspector, dark-theme compatibility, all four disabled coming-soon preset cards, launch chooser, public policy/contact routes, desktop and 390px landing layouts, mobile static trace, mobile auth gate, and zero horizontal overflow. The Vite session showed no application error overlay; React Flow emitted its known HMR node-types warning during local hot reload.
- Release commits `06b3044` and `00d3fbb` were pushed to `dev`. The Oracle checkout was fast-forwarded to `00d3fbb` without a service restart because the release changes only the frontend and documentation; `slotforge-api.service` remained active, `/health` and `/health/db` returned HTTP 200, the database remained at Alembic head `c7d4e5f6a7b8`, and the recent error-level journal was empty.

- Revamped the authenticated workspace experience: `/` is now the signed-in dashboard while `/landing` remains public; added auth loading transitions, a signup work-role field, and a profile editor that keeps professional role separate from security access.
- Fixed recurring onboarding by aligning the backend with all 12 frontend steps (including assignments) and making route guards wait for workspace-specific server progress before redirecting.
- Rebuilt Canvas as an Obsidian-style relationship constellation with typed nodes, focus/fade selection, labeled direct edges, searchable views, neighbor traversal, and a detailed inspector.
- Grouped repeated Constraint Playground and Solver rules, replaced raw version-history UUID fragments with resolved timetable cards, and moved the Settings save panel into a zoom-safe floating layout.
- Added the nullable `profiles.job_title` migration and authenticated `PATCH /auth/me`; added integration coverage for signup/profile updates and full onboarding persistence.
- Local verification passed: backend `54 passed`, frontend production build passed, Oxlint completed with the three existing Fast Refresh warnings, and the authenticated browser suite exercised the requested screens and routing at desktop and 125% emulation.
- Pushed release `9bdf2f2` to `dev`, fast-forwarded Oracle, migrated PostgreSQL to `c7d4e5f6a7b8`, and restarted `slotforge-api.service`. `/health` and `/health/db` returned HTTP 200, authenticated `/auth/me` returned 200 with the new profile field, and the recent error-level journal was empty. Vercel completed successfully and the deployed frontend returned HTTP 200.

- Updated the landing and application-shell baseline through `fed3b5a`: removed global app-route transitions that remounted the sidebar/topbar, pinned the protected topbar, and retained transitions only for page content. The sidebar logo no longer has a hover lift/shadow treatment.
- Reworked the public landing navigation with the SlotForge Fraunces wordmark, mono utility links, larger actions, auth-aware sign-in/create-institution behavior, and smooth, header-offset section scrolling.
- Replaced the abstract scheduling-node hero illustration with an app-like weekly draft preview showing timetable placements, rooms, readiness, conflict status, and coverage. Removed its decorative pulse/connector animation CSS.
- Fixed landing workflow-label contrast and isolated FAQ accordion state inside `LandingFaq`, preventing a full animated landing-page render when an answer opens.
- Frontend production builds passed for the changes above (latest build at `fed3b5a`); the existing large-chunk warning remains. Pushed frontend commits `8be3119`, `dee4465`, `bf5ffb2`, `d0d5886`, `11c4cf7`, and `fed3b5a` to `dev`. No Oracle API release was needed because these are frontend-only changes.

- Refined the public landing motion and navigation: added the floating, scroll-responsive navigation bar, SlotForge-styled sign-in/create-institution actions, staged hero and content reveals, subtle solver-map animation, global route transitions, and loading/onboarding loading-state entrances with reduced-motion support.
- Committed and pushed `6cd68c7` (`refine landing motion and navigation`) to `dev`; fast-forwarded Oracle, confirmed Alembic head `8a1c2d3e4f50`, restarted `slotforge-api.service`, and verified `/health` and `/health/db` both returned HTTP 200 without new error-level logs. Vercel dev returned HTTP 200 from a fresh deployment.

- Revamped the public SlotForge landing around the downloaded Stitch reference: editorial hero, scheduling-logic map, product workflow, capability bento grid, academic constraints section, FAQ, CTA, and footer. Public CTAs remain auth-aware.
- Separated onboarding from the authenticated application shell, added a standalone Newton's-cradle loading screen, restored functional shell utilities, and added onboarding assignment mapping plus real resource deletion.
- Committed and pushed `dbac2ef` (`revamp public landing and app shell`) to `dev`.
- Fast-forwarded the Oracle VPS to `dbac2ef`; preserved `deploy.sh` and `diagnose.sh`; no migration was pending (`8a1c2d3e4f50` head). Restarted `slotforge-api.service`; `/health` and `/health/db` both returned HTTP 200 with no new error-level service logs.
- Verified `https://slotforge-dev.vercel.app/` returned HTTP 200 immediately after the pushed deployment. Frontend build passed; lint completed with the existing three Fast Refresh warnings and the existing large-chunk warning.

## 2026-07-25

- Configured light mode as default across the application (`data-theme="light"` on `html` and default fallback in `ThemeContext.tsx`).
- Enhanced color vibrancy in `tokens.css`: upgraded primary emerald green to `#0d7a5b`, secondary orange to `#d95714`, and updated surface tints for a fresh modern look.
- Made Onboarding mandatory for new users: `ProtectedRoute` and `PublicAuthRoute` in `router.tsx` automatically redirect accounts with uncompleted/unskipped setups to `/onboarding`.
- Streamlined Onboarding UX: removed intrusive portal overlay and body scroll-lock, redesigned wizard navigation into a clean 5-step progress pill bar.
- Verification: frontend `oxlint` 0 errors, `npm run build` completed in 1.49s, backend pytest `52 passed`. Committed commit `af7c0b7` and pushed to `origin/dev`.

- Completed Phase 12 UI Polish: implemented smooth route transitions using Framer Motion (`AnimatePresence` + `motion.div`), sliding active indicator in `Sidebar.tsx` (`layoutId="sidebar-active-indicator"`), list stagger entry animations on card grids and lists, modal slide/fade transitions, pulsing solver indicator in `SolverEnginePage.tsx`, and hover micro-animations on cards and timetable cells.
- Standardized typography and tabular numerals: preserved Fraunces (display/headings) and Roboto Flex (body) font stack, applied `tabular-nums` across tables and statistics.
- Fixed Constraint Playground UI layout: fixed active rule toggle switch buttons with `shrink-0` to eliminate green blob text overlap glitches.
- Added Mobile Day View mode to `TimetableGrid.tsx` with day selection tabs for responsive single-day view on mobile.
- Verification: frontend `oxlint` 0 errors, `npm run build` completed successfully, backend unit/integration suite `52 passed`.

- Fixed the Heatmap right-edge leak by removing the closed impact drawer from the DOM and rendering the open drawer through a document-level portal, outside route animations.
- Added the protected-app mobile gate with desktop-site + landscape recovery instructions, reload action, and Android app coming-soon messaging.
- Verified backend `52 passed`, frontend build/lint passed with existing warnings only, synchronized Oracle to `53eb412`, and confirmed the connected Vercel deployment completed successfully.
- Implemented Phase 11 Canvas Map: added the authenticated workspace canvas API with resource, constraint, conflict, and version graph views, including typed nodes/edges and live pressure metadata.
- Replaced the decorative fixed-column Canvas with a React Flow control-room interface: view switcher, workspace selector, search, focus mode, node inspector, pan/zoom controls, minimap, relationship labels, and conflict pressure styling.
- Deployed `796cdaf` to Oracle, verified `/health` and `/health/db`, revalidated Supabase login plus `/auth/me`, and smoke-tested all four Canvas views against live workspace data.
- Reproduced and fixed the deeper recurring Auth failure: the Supabase Auth user could outlive the entire local demo graph. The known demo account now invokes the idempotent seed with the real Auth UUID when needed; added regression coverage and verified recovery across an API restart.
- Skipped Phase 10 as requested.
- Implemented and deployed Phase 9 Version Control: schedule-version lifecycle metadata/migration, branch and rollback drafts, assignment/resource diffing, publish/archive transitions, workspace APIs, and the version history UI.
- Fixed Phase 9 branch copying so assignment-location metadata updates the automatically-created room join instead of duplicating its primary key.
- Added focused diff-engine coverage (`5 passed` with the Phase 8 unit tests), verified frontend build/lint, migrated Oracle to `8a1c2d3e4f50`, and passed authenticated production smoke tests for branch, compare, archive, rollback, publish, and publish restoration.
- Diagnosed the recurring production login failure: Supabase Auth users existed but `profiles` was empty, so authenticated `/auth/me` returned 404. Fixed demo seeding to retain the real Auth user ID when password-sync administration fails, and added regression coverage.
- Deployed `20f24f3` to Oracle, reseeded the matching production profile, and verified Supabase login plus authenticated `/auth/me` returned HTTP 200.

## 2026-07-24
- Deployed `ca0df8a` to the Oracle VPS by fast-forward; service restart and post-deploy verification passed. VPS remains on Alembic head `fc1b2d3e4f50` with preserved untracked helpers `deploy.sh` and `diagnose.sh`.
- Completed the Codex portion of Phase 8: added the Constraint Playground UI at `/constraints`, sidebar navigation, template configuration, rule preview, enable/disable, edit, and delete flows.
- Fixed a backend Phase 8 gap where academic, event, exam, and staff-roster adapters bypassed `ConstraintCompiler` and passed raw penalties as solver weights. All active preset rules now use compiler mappings, preserving hard/soft semantics and template defaults.
- Verification: backend `48 passed`; frontend build passed; frontend lint passed with the repository's existing Fast Refresh warnings and the normal large-chunk warning.
- Audited and synchronized the handoff context against the local repository and Oracle VPS: repository checkout `e67ff26`, latest backend-affecting commit `38af1b0`, service active, and both health endpoints passing.
- Repaired the production demo account by creating its missing local profile and organization membership, then verified Supabase login and authenticated `/auth/me` returned 200.
- Fixed the resource-page impact drawer appearing at the right edge after successful no-conflict saves.
- Added the reusable `slotforge-oracle-deploy` skill for pushing `dev`, updating the Oracle VPS through the `server` SSH alias, restarting/verifying `slotforge-api.service`, and diagnosing backend failures safely.
- Fixed the production assignment-save failure caused by `Constraint` inserts missing the required `workspace_id` (`ConstraintRule` listener now propagates to the compatibility subclass).
- Fixed the follow-up generic-schema failure by supplying required constraint `name` and `rule_type` values for legacy assignment/API creation paths.
- Updated `/health/db` to check the current generic schema, removing a false degraded/503 result caused by stale legacy column checks.
- Added the SlotForge context pack for future LLM and developer handoffs.
- Documented the current architecture and the teacher/subject assignment data flow.
- Recorded recent fixes for assignment Save races, visible errors, constraint creation, and Canvas lane layout.
- Implemented Phase 8 Constraint Playground backend: added constraint template registry (12 templates), solver function mappings (`SOLVER_FUNCTIONS`), `ConstraintCompiler`, workspace constraint CRUD endpoints, and rule impact preview API.
- Verification recorded: frontend build and lint passed; backend pytest suite passed (14 unit/integration tests).
