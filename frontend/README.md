# SlotForge frontend

The SlotForge web client is a React 19 + TypeScript + Vite application for academic scheduling setup, solver review, timetable versioning, faculty views, exports, and public project pages.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Required browser environment variables:

```dotenv
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_public_client_key
```

The Supabase client key is public by design, but it must never be replaced with a service-role or secret key. Backend credentials belong only in `backend/.env` or the deployment platform.

Password, Google, and GitHub authentication all use the same Supabase project.
Social identities return through `/auth/callback`; first-time users then finish
their application profile and institution at `/complete-account`. Provider
client secrets are configured in Supabase and never belong in this frontend.
See the [Supabase setup guide](../docs/SUPABASE_SETUP.md) for callback URLs.

## Checks

```bash
npm run build
npm run lint
```

The protected scheduling console is desktop-first. The landing page, project policies, open-source page, contact page, and faculty share pages remain public; login, signup, onboarding, and the console show the mobile experience gate on narrow portrait devices.

See the [project README](../README.md), [contribution guide](../CONTRIBUTING.md), and [testing guide](../docs/TESTING.md).
