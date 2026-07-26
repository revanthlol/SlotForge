# SlotForge UML v2

[`v2`](v2/) is the current, simplified diagram set for faculty demonstrations and project reviews. It explains the real product without requiring the audience to read every implementation table or API route.

- `usecase-diagram` — what administrators and faculty can do
- `activity-diagram` — the generate/review/publish workflow
- `sequence-diagram` — authentication and timetable generation
- `class-diagram` — familiar academic concepts mapped to the generic solver model
- `er-diagram` — the current core database relationships and real table names
- `deployment-diagram` — Vercel, Supabase Auth/PostgreSQL, and the Oracle API

The complete 20-table structure is published separately in [`../database/schema.sql`](../database/schema.sql). The ER diagram stays intentionally selective for presentation readability.

Validate and render:

```bash
plantuml -checkonly docs/uml/v2/*.puml
plantuml -tsvg docs/uml/v2/*.puml
plantuml -tpng docs/uml/v2/*.puml
```

UML v1 was removed because it described superseded architecture. Keep v2 aligned with the current product whenever data ownership, deployment, or major workflows change.
