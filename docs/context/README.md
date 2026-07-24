# SlotForge Context Pack

This folder is the handoff point for humans and LLMs continuing work on SlotForge.
Read these files in order before making changes:

1. [`CURRENT_STATE.md`](./CURRENT_STATE.md) — what is working, what is in progress, and known risks.
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — where the main frontend, API, database, and solver pieces live.
3. [`WORKFLOW.md`](./WORKFLOW.md) — how to investigate, change, test, and document work.
4. [`CHANGELOG.md`](./CHANGELOG.md) — concise history of context-relevant changes.

## Maintenance rule

Every code or configuration change must update this context pack in the same change set:

- Update `CURRENT_STATE.md` when behavior, known bugs, routes, setup, or priorities change.
- Update `ARCHITECTURE.md` when ownership, data flow, APIs, or important file locations change.
- Add one dated entry to `CHANGELOG.md` for the change and its verification.
- Update `WORKFLOW.md` only when the team’s development or handoff process changes.

Keep entries short and factual. Do not paste secrets, tokens, private URLs, or full chat logs here.

## Fast handoff template

Before starting: state the requested outcome, read the four files above, inspect the current git diff, and identify the smallest reproducible failure.

Before handing off: record changed files, verification commands and results, remaining risks, and the next sensible task.
