# Context Changelog

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
