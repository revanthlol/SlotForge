# SlotForge — Supabase & Joy UI Setup

This covers Phase 4 (Supabase: DB/Auth/Storage) and the Joy UI piece of Phase 6.
Do this **after** Phase 1–3 are working (solver core + sync API + Redis queue) — don't context-switch into DB setup before the engine actually solves anything.

---

## Part A — Supabase Project Setup

### A.1 — Create the project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Pick a region close to wherever your Oracle VPS will live (lower latency between API and DB matters more than latency to end users here, since every API request round-trips through Postgres).
3. Save the generated **database password** somewhere safe immediately — Supabase only shows it once.
4. Wait for provisioning (~2 min).

### A.2 — Collect your keys

From **Project Settings → API**:
- `Project URL` → `SUPABASE_URL`
- `anon` `public` key → `SUPABASE_ANON_KEY` (safe for frontend, respects RLS)
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**backend only**, bypasses RLS — never ship this to the frontend or commit it)

From **Project Settings → API → JWT Settings**:
- `JWT Secret` → `SUPABASE_JWT_SECRET` (used by FastAPI to verify tokens Supabase issues)

From **Project Settings → Database**:
- Connection string (use the **pooler** connection string, not the direct one, once you're past local dev — Supabase's pgbouncer pooler handles connection limits better under concurrent load from your async worker + API both hitting the DB)
- → `DATABASE_URL`

Drop all of these into `backend/.env` (never `.env.example`, never commit the real values).

### A.3 — Enable required extensions

In the Supabase SQL Editor, run:

```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
```

---

## Part B — Schema & Multi-Tenancy

### B.1 — Core tables

Run this in the Supabase SQL Editor (or better, generate it via Alembic migrations once your SQLAlchemy models are written — this is the "by hand once, then automated" version so you can see the shape):

```sql
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null check (role in ('org_admin', 'viewer')),
  full_name text,
  created_at timestamptz not null default now()
);

create table teachers (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table rooms (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  capacity int not null,
  room_type text not null default 'lecture',
  created_at timestamptz not null default now()
);

create table subjects (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  weekly_hours int not null,
  created_at timestamptz not null default now()
);

create table sections (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  size int not null,
  created_at timestamptz not null default now()
);

-- Constraints stored as generic rows, not hardcoded — solver reads these
create table constraints (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  constraint_type text not null,        -- e.g. 'teacher_unavailable', 'max_per_day', 'preferred_room'
  payload jsonb not null,               -- e.g. {"teacher_id": "...", "day": "Fri"}
  weight int default null,              -- null = hard constraint, int = soft constraint weight
  created_at timestamptz not null default now()
);

create table timetable_versions (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  version_number int not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  scores jsonb default '{}'::jsonb,     -- {"preference_score": 85, "utilization_score": 95, ...}
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organization_id, version_number)
);

create table timetable_slots (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  timetable_version_id uuid not null references timetable_versions(id) on delete cascade,
  section_id uuid not null references sections(id),
  subject_id uuid not null references subjects(id),
  teacher_id uuid not null references teachers(id),
  room_id uuid not null references rooms(id),
  day text not null,
  period int not null
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,                 -- e.g. 'teacher.delete', 'slot.edit', 'timetable.publish'
  target_table text,
  target_id uuid,
  diff jsonb,
  created_at timestamptz not null default now()
);
```

### B.2 — Indexes (don't skip — every query below filters by org)

```sql
create index idx_teachers_org on teachers(organization_id);
create index idx_rooms_org on rooms(organization_id);
create index idx_subjects_org on subjects(organization_id);
create index idx_sections_org on sections(organization_id);
create index idx_constraints_org on constraints(organization_id);
create index idx_versions_org on timetable_versions(organization_id);
create index idx_slots_org on timetable_slots(organization_id);
create index idx_slots_version on timetable_slots(timetable_version_id);
create index idx_audit_org on audit_logs(organization_id);
```

---

## Part C — Row-Level Security (the actual point of using Supabase over raw Postgres)

Enable RLS on every tenant-scoped table, then write policies that check the caller's `organization_id` against their JWT claim.

```sql
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table teachers enable row level security;
alter table rooms enable row level security;
alter table subjects enable row level security;
alter table sections enable row level security;
alter table constraints enable row level security;
alter table timetable_versions enable row level security;
alter table timetable_slots enable row level security;
alter table audit_logs enable row level security;
```

Helper to read the caller's org from their profile row:

```sql
create or replace function auth.user_org_id()
returns uuid
language sql stable
as $$
  select organization_id from profiles where id = auth.uid()
$$;
```

Example policy pattern (repeat per table, swapping the table name):

```sql
create policy "org members can read teachers"
on teachers for select
using (organization_id = auth.user_org_id());

create policy "org admins can write teachers"
on teachers for all
using (
  organization_id = auth.user_org_id()
  and exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'org_admin'
  )
);
```

**Note:** your FastAPI backend will likely use the `service_role` key for most operations (since it does its own auth/role checking in application code anyway), which bypasses RLS entirely. RLS becomes critical the moment anything — Supabase client SDK calls from the frontend, future direct DB access — talks to Postgres without going through your API. Set it up now regardless; retrofitting RLS after data exists is much more annoying than designing with it from day one.

---

## Part D — Supabase Auth

1. **Authentication → Providers**: enable Email (and any OAuth providers you want — Google is the easy one for institutional users).
2. **Authentication → URL Configuration**: set your site URL (Vercel deployment URL once it exists; `http://localhost:5173` for local dev).
3. On signup, you need a flow that also creates the `organizations` row and the `profiles` row linking the new user as `org_admin` of their new org. Easiest approach: a Postgres trigger on `auth.users` insert, or handle it explicitly in your FastAPI signup endpoint (recommended — keeps the logic visible in your own codebase instead of buried in a DB trigger).

### D.1 — Verifying Supabase JWTs in FastAPI

```python
import jwt
from fastapi import Depends, HTTPException, Header

SUPABASE_JWT_SECRET = "your_jwt_secret_here"  # from .env

def get_current_user(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload  # contains 'sub' (user id), among other claims
```

Then look up the `profiles` row for `payload["sub"]` to get `organization_id` and `role` for use in your endpoint logic.

---

## Part E — Supabase Storage

1. **Storage → New Bucket** → name it `exports` (for PDF/Excel/CSV) and a second one `assets` (for org logos, profile pictures).
2. Set `exports` to **private** — generate signed URLs server-side per download request, don't make it public.
3. Set `assets` to **public** if logos need to render directly in `<img>` tags without a signed URL roundtrip — fine for non-sensitive content.

Example upload from FastAPI using the Supabase Python client:

```python
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def upload_export(org_id: str, filename: str, file_bytes: bytes) -> str:
    path = f"{org_id}/{filename}"
    supabase.storage.from_("exports").upload(path, file_bytes)
    signed = supabase.storage.from_("exports").create_signed_url(path, expires_in=3600)
    return signed["signedURL"]
```

Install with: `pip install supabase` (add to `requirements.txt`).

---

## Part F — Joy UI (Frontend, Phase 6)

You're using **Joy UI**, not MUI Material — different theming system, different component API, worth being explicit about since most MUI tutorials online are Material-flavored and don't directly transfer.

### F.1 — Install

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install @mui/joy @emotion/react @emotion/styled
npm install @supabase/supabase-js
```

### F.2 — Theme setup

Joy UI ships its own `CssVarsProvider` — wrap your app root:

```tsx
// main.tsx
import { CssVarsProvider } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import { theme } from './theme';

<CssVarsProvider theme={theme} defaultMode="light">
  <CssBaseline />
  <App />
</CssVarsProvider>
```

```tsx
// theme.ts — customize palette toward your Material 3 Expressive direction
import { extendTheme } from '@mui/joy/styles';

export const theme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          500: '#2d5d4f', // matches your project doc's accent pine
        },
      },
    },
  },
  fontFamily: {
    display: "'Fraunces', Georgia, serif",
    body: "'IBM Plex Sans', sans-serif",
  },
});
```

### F.3 — Supabase client (frontend side, uses the **anon** key, never service_role)

```ts
// supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

`.env` for the frontend (Vite requires the `VITE_` prefix to expose vars to client code):

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_BASE_URL=http://localhost:8000
```

### F.4 — A note on Joy UI maturity

Joy UI is still labeled beta by MUI — fewer components than Material UI (no `DataGrid` equivalent built-in, for instance — you'll want **TanStack Table** headless + Joy UI's `Table` component for styling, rather than expecting a drop-in data grid). Worth knowing going in so you're not surprised mid-build; it's a deliberate trade for the Material 3–esque visual language, not a bug in your setup.

---

## Quick verification checklist

- [ ] Can sign up a new user via Supabase Auth from a `curl` or simple test script, confirm a `profiles` row gets created with a new `organization_id`
- [ ] Can insert a `teachers` row scoped to org A, confirm a JWT for org B's user cannot read it (test RLS explicitly, don't trust it blindly)
- [ ] FastAPI can decode a Supabase-issued JWT and extract `organization_id`
- [ ] A file uploads to the `exports` bucket and a signed URL downloads it successfully
- [ ] Joy UI renders with your custom theme colors visible (not default MUI blue)
