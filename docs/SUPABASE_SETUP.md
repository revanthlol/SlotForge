# Supabase setup and security boundaries

SlotForge uses Supabase Auth for user identity and PostgreSQL for application data. The React client authenticates with Supabase, then sends the access token to FastAPI. FastAPI verifies the token and enforces organization membership and admin permissions before querying PostgreSQL.

## Environment variables

Frontend (`frontend/.env`):

```dotenv
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_public_client_key
```

Backend (`backend/.env`): use the names and placeholders in `backend/.env.example`. Keep database URLs, Supabase secret keys, and service credentials server-side. Never copy a service-role or secret key into a `VITE_` variable.

## Database lifecycle

Alembic migrations in `backend/migrations/versions` are the schema source of truth:

```bash
cd backend
.venv/bin/alembic current
.venv/bin/alembic heads
.venv/bin/alembic upgrade head
```

The public [`database/schema.sql`](database/schema.sql) is a reproducible schema-only snapshot for review and self-hosting. It excludes Supabase-managed `auth.users`, all records, ownership statements, grants, credentials, and connection URLs. `profiles.id` corresponds to the authenticated Supabase user UUID at the application boundary.

## Access model

- Supabase Auth owns identity and session issuance.
- `profiles` stores application profile fields.
- `organization_memberships` connects profiles to organizations with an application role.
- Tenant-scoped requests pass through FastAPI, which validates membership and admin privileges.
- Publishing SQL does not expose or grant access to any running database.

## Google and GitHub sign-in

SlotForge uses Supabase as the single identity authority for password, Google,
and GitHub sign-in. Do not add Firebase Auth beside it: two identity authorities
would issue unrelated user IDs and sessions for the same person.

For the hosted project in this repository, Google and GitHub both return to the
Supabase Auth callback:

```text
https://pmsynjcrwfqobnytcjgz.supabase.co/auth/v1/callback
```

Google Cloud setup:

1. Create an OAuth client with application type **Web application**.
2. Add `https://slotforge-dev.vercel.app` and `http://localhost:5173` as authorized JavaScript origins.
3. Add the Supabase callback above as the authorized redirect URI.
4. Copy the client ID and secret into **Supabase → Authentication → Sign In / Providers → Google**.

GitHub setup:

1. Create a **GitHub OAuth App**, not a GitHub App.
2. Use `https://slotforge-dev.vercel.app` as its homepage URL.
3. Use the Supabase callback above as its authorization callback URL and leave Device Flow disabled.
4. Copy the client ID and secret into **Supabase → Authentication → Sign In / Providers → GitHub**.

Finally, configure Supabase Auth URL Configuration:

```text
Site URL: https://slotforge-dev.vercel.app
Redirect allow list:
https://slotforge-dev.vercel.app/auth/callback
http://localhost:5173/auth/callback
```

Provider secrets belong only in Google/GitHub and the Supabase dashboard. They
must not be placed in frontend environment variables or committed files.

After a social identity is verified, `/auth/complete-account` idempotently
creates its initial organization, application profile, and membership. Existing
profiles are returned unchanged. Authorization always comes from the database;
user-editable OAuth metadata is never trusted as an application role.

Do not claim complete row-level security coverage from this repository. The current application authorization boundary is FastAPI. If the Supabase Data API is enabled for an application table, explicitly grant only the required roles and enable/test RLS first.

Supabase changed new-table Data API exposure defaults in 2026; Data API grants and RLS are separate controls. Review the current [Supabase API security guide](https://supabase.com/docs/guides/api/securing-your-api) before exposing a schema.

## Security checklist

- Keep secret/service-role keys out of clients and version control.
- Never use user-editable metadata as an authorization source.
- Scope every data query and mutation to an authorized organization/workspace.
- Treat public faculty links as bearer links; expire or revoke them when no longer needed.
- If adding RLS policies, combine role targeting with row ownership/membership predicates; an `authenticated` role alone is not tenant authorization.
- Use both `USING` and `WITH CHECK` for update policies.
- Prefer security-invoker database code. Review and restrict any unavoidable security-definer function.
- Re-run backend tests and `/health/db` after migrations.
- Keep the test suite on its disposable Docker PostgreSQL container; never point pytest at Supabase.
