# Phase 2 — Frontend Restructure + Design System

**Agent:** Codex  
**Depends on:** Phase 0 (can start in parallel while Antigravity does Phase 0)  
**Blocks:** All frontend phases (Phase 3, 5, 6, 11, 12)  
**Estimated effort:** Medium (2–3 days)

---

## Goal

Restructure the frontend from the current flat `pages/` layout to a
**feature-based architecture**. Set up the design system (tokens, typography,
theme). Install and configure all required libraries. This is the frontend
equivalent of Phase 0 — the foundation everything else builds on.

**Do NOT build any new features in this phase.** Only restructure and set up.

---

## New Frontend Directory Structure

```
src/
├── app/
│   ├── router.tsx          # All routes defined here
│   ├── providers.tsx       # QueryClient, Auth, Theme providers
│   └── layout.tsx          # App shell (sidebar + topbar)
├── features/
│   ├── onboarding/         # Phase 3
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.tsx
│   ├── presets/            # Phase 4
│   ├── timetable/          # existing TimetablePage → moves here
│   ├── faculty/            # Phase 5
│   ├── exports/            # Phase 6
│   ├── heatmap/            # Phase 7
│   ├── constraints/        # Phase 8
│   ├── versions/           # Phase 9
│   ├── canvas/             # Phase 11
│   └── settings/
├── components/
│   ├── ui/                 # shadcn-style base components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── PageShell.tsx
│   └── charts/
├── lib/
│   ├── api/
│   │   ├── client.ts       # axios/fetch base
│   │   └── hooks/          # TanStack Query hooks
│   ├── auth/
│   └── utils/
├── styles/
│   ├── tokens.css          # Design tokens
│   ├── typography.css
│   └── themes.css
└── types/
    ├── workspace.ts
    ├── resource.ts
    ├── task.ts
    └── schedule.ts
```

---

## Libraries to Install

```bash
npm install @tanstack/react-query @tanstack/react-table
npm install react-hook-form zod @hookform/resolvers
npm install motion
npm install reactflow
npm install recharts
npm install jspdf html2canvas xlsx
npm install react-router-dom
```

---

## Design System — tokens.css

```css
:root {
  /* Brand */
  --color-brand-primary: hsl(221, 83%, 53%);
  --color-brand-accent: hsl(262, 80%, 60%);
  
  /* Backgrounds */
  --color-bg-base: hsl(222, 20%, 8%);
  --color-bg-elevated: hsl(222, 18%, 12%);
  --color-bg-card: hsl(222, 16%, 16%);
  --color-bg-hover: hsl(222, 14%, 20%);

  /* Text */
  --color-text-primary: hsl(0, 0%, 96%);
  --color-text-secondary: hsl(220, 10%, 60%);
  --color-text-muted: hsl(220, 8%, 45%);

  /* Borders */
  --color-border: hsl(222, 14%, 22%);
  --color-border-subtle: hsl(222, 12%, 18%);

  /* Status */
  --color-success: hsl(142, 70%, 45%);
  --color-warning: hsl(38, 92%, 50%);
  --color-error: hsl(0, 72%, 51%);
  --color-info: hsl(199, 89%, 48%);

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

---

## Sidebar Revamp

The sidebar should feel like **Linear / Obsidian** — clean, minimal, icon + label.

```
SlotForge                           [org picker]
─────────────────────────────────────
⊞  Dashboard
━  Workspace
   ├─ Resources
   ├─ Tasks
   ├─ Groups
   └─ Locations
━  Schedule
   ├─ Solver Engine
   ├─ Timetable
   ├─ Faculty View
   └─ Version History
━  Tools
   ├─ Constraint Playground
   ├─ Conflict Heatmap
   └─ Canvas Map
━  Settings
   ├─ Presets
   ├─ Multi-user
   └─ Exports
─────────────────────────────────────
[User avatar]  [Notifications]
```

---

## TypeScript Types

Define shared types that all features will use:

```typescript
// types/workspace.ts
export interface Workspace {
  id: string;
  name: string;
  domainPreset: 'academic' | 'staff_roster' | 'event' | 'exam' | 'facility';
  organizationId: string;
}

// types/resource.ts
export interface Resource {
  id: string;
  workspaceId: string;
  name: string;
  resourceType: string;
  metadata: Record<string, unknown>;
  availability: TimeSlotMatrix;
}

// types/schedule.ts
export interface ScheduleRun {
  id: string;
  workspaceId: string;
  versionLabel: string;
  status: 'draft' | 'published' | 'archived';
  solverScore: number | null;
  createdAt: string;
}
```

---

## TanStack Query Setup

```typescript
// lib/api/client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

// lib/api/hooks/useResources.ts
export const useResources = (workspaceId: string) =>
  useQuery({
    queryKey: ['resources', workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/resources`),
  });
```

---

## Migration Steps

1. Create the new `features/`, `styles/`, `types/`, `lib/` directories
2. Move existing pages into feature folders:
   - `TeachersPage.tsx` → `features/timetable/pages/ResourcesPage.tsx`
   - `TimetablePage.tsx` → `features/timetable/pages/TimetablePage.tsx`
   - etc.
3. Update `router.tsx` with all new paths
4. Install all libraries listed above
5. Create `tokens.css` and import in `main.tsx`
6. Set up `providers.tsx` with QueryClient and AuthProvider
7. Build new `Sidebar.tsx` and `Topbar.tsx`

---

## Done Criteria

- [ ] New directory structure in place
- [ ] All existing pages still work after restructure (no regressions)
- [ ] `tokens.css` and typography in place
- [ ] New Sidebar and Topbar components built
- [ ] All required npm libraries installed
- [ ] TypeScript types defined for all core models
- [ ] TanStack Query client configured
- [ ] Router uses new feature paths
