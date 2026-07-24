# Context Changelog

## 2026-07-24

- Fixed the production assignment-save failure caused by `Constraint` inserts missing the required `workspace_id` (`ConstraintRule` listener now propagates to the compatibility subclass).
- Fixed the follow-up generic-schema failure by supplying required constraint `name` and `rule_type` values for legacy assignment/API creation paths.
- Updated `/health/db` to check the current generic schema, removing a false degraded/503 result caused by stale legacy column checks.
- Added the SlotForge context pack for future LLM and developer handoffs.
- Documented the current architecture and the teacher/subject assignment data flow.
- Recorded recent fixes for assignment Save races, visible errors, constraint creation, and Canvas lane layout.
- Verification recorded: frontend build passed; frontend lint passed with existing Fast Refresh warnings; backend solver/scoring tests passed (12 tests).
