# Phase 10 — Multi-user RBAC (Admin / Editor / Viewer)

**Agent:** Antigravity (backend RBAC + invite system) + Codex (team management UI)  
**Depends on:** Phase 0 (organization_memberships schema)  
**Blocks:** Nothing  
**Estimated effort:** Large (3–5 days)  
**Priority:** Stretch goal — do after Phases 0–9 are complete

---

## Goal

Wire up the existing `organization_memberships` table (currently unused) into a
full **role-based access control system** where:
- **Admin** — full access, can invite/remove members, manage everything
- **Editor** — can add/edit resources, run solver, manage drafts; cannot publish or manage users
- **Viewer** — read-only access to timetables, cannot modify anything

---

## Role Permission Matrix

| Action | Admin | Editor | Viewer |
|---|---|---|---|
| View timetables | ✅ | ✅ | ✅ |
| Add/edit resources (teachers, rooms, etc.) | ✅ | ✅ | ❌ |
| Run solver | ✅ | ✅ | ❌ |
| Create/edit drafts | ✅ | ✅ | ❌ |
| Manage constraint playground | ✅ | ✅ | ❌ |
| Publish / archive versions | ✅ | ❌ | ❌ |
| Generate faculty share links | ✅ | ❌ | ❌ |
| Export timetables | ✅ | ✅ | ✅ |
| Invite / remove members | ✅ | ❌ | ❌ |
| Change org settings | ✅ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ |

---

## Data Model (extending existing organization_memberships)

```python
class OrganizationMembership(Base):
    id: UUID
    organization_id: UUID
    user_id: UUID
    role: str              # "admin" | "editor" | "viewer"
    status: str            # "active" | "invited" | "suspended"
    invited_by: UUID | None
    invited_at: datetime | None
    joined_at: datetime | None
    created_at: datetime

class Invitation(Base):
    id: UUID
    organization_id: UUID
    email: str             # invited email (may not be a user yet)
    role: str
    token: str             # UUID token for invite link
    invited_by: UUID
    expires_at: datetime
    accepted_at: datetime | None
    status: str            # "pending" | "accepted" | "expired" | "cancelled"
```

---

## Invite Flow

1. Admin goes to Settings → Team Members
2. Clicks "Invite Member"
3. Enters email + selects role (Editor or Viewer)
4. System sends invite email with link: `https://slotforge.vercel.app/invite/{token}`
5. Invitee clicks link → if no account: goes to signup → then auto-joins org
6. If already has account: clicks "Accept" → joins org

**Email format (plain text is fine):**
```
You've been invited to join [Org Name] on SlotForge.

[Org Name] uses SlotForge to manage scheduling.
You've been invited as: Editor

Click to accept: https://slotforge.vercel.app/invite/abc123

This invite expires in 7 days.
```

---

## API Endpoints

```
GET  /api/v1/organizations/{id}/members/
     → list all members with roles and status

POST /api/v1/organizations/{id}/invitations/
     body: { email, role }
     → send invite, create Invitation record

GET  /api/v1/invitations/{token}
     → get invite details (public, no auth) → org name, role, expiry

POST /api/v1/invitations/{token}/accept
     → authenticated user accepts invite → creates OrganizationMembership

PATCH /api/v1/organizations/{id}/members/{user_id}
     body: { role }
     → change a member's role (admin only)

DELETE /api/v1/organizations/{id}/members/{user_id}
     → remove a member (admin only)

POST /api/v1/invitations/{id}/cancel
     → cancel a pending invite
```

---

## Permission Enforcement (Backend)

```python
# app/core/permissions.py

class Permission(str, Enum):
    VIEW_TIMETABLE = "view_timetable"
    EDIT_RESOURCES = "edit_resources"
    RUN_SOLVER = "run_solver"
    MANAGE_DRAFTS = "manage_drafts"
    PUBLISH_VERSION = "publish_version"
    MANAGE_CONSTRAINTS = "manage_constraints"
    GENERATE_SHARE_LINKS = "generate_share_links"
    INVITE_MEMBERS = "invite_members"
    MANAGE_ORG = "manage_org"

ROLE_PERMISSIONS = {
    "admin": {Permission.VIEW_TIMETABLE, Permission.EDIT_RESOURCES, Permission.RUN_SOLVER,
              Permission.MANAGE_DRAFTS, Permission.PUBLISH_VERSION, Permission.MANAGE_CONSTRAINTS,
              Permission.GENERATE_SHARE_LINKS, Permission.INVITE_MEMBERS, Permission.MANAGE_ORG},
    "editor": {Permission.VIEW_TIMETABLE, Permission.EDIT_RESOURCES, Permission.RUN_SOLVER,
               Permission.MANAGE_DRAFTS, Permission.MANAGE_CONSTRAINTS},
    "viewer": {Permission.VIEW_TIMETABLE},
}

def require_permission(permission: Permission):
    """FastAPI dependency that checks the current user has this permission"""
    async def check(current_user=Depends(get_current_user), workspace_id: UUID = ...):
        membership = get_membership(current_user.id, workspace_id)
        if permission not in ROLE_PERMISSIONS[membership.role]:
            raise HTTPException(403, "Insufficient permissions")
    return check
```

Apply to routes:
```python
@router.post("/schedule-runs/{id}/publish")
async def publish_version(
    _=Depends(require_permission(Permission.PUBLISH_VERSION))
):
    ...
```

---

## Frontend — Team Management UI

**Route:** `/settings/team`

```
Team Members
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[+ Invite Member]

Member              Role      Status    Actions
────────────────────────────────────────────────
Rev Anthlol         Admin     Active    (you)
Dr. Patel           Editor    Active    [Change Role] [Remove]
Ms. Priya           Viewer    Active    [Change Role] [Remove]
john@example.com    Editor    Invited   [Resend] [Cancel]

Pending Invites (1)
└─ john@example.com  Editor  Expires in 5 days  [Cancel]
```

### Invite Modal

```
Invite Team Member
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email:  [john@example.com          ]
Role:   [Editor ▼]
         • Editor — can manage resources and run solver
         • Viewer — read-only access to timetables

[Send Invite]   [Cancel]
```

### Role Change Confirmation

```
Change Dr. Patel's role from Editor → Viewer?
This will immediately remove their ability to edit resources and run the solver.

[Confirm]   [Cancel]
```

---

## Frontend — Permission-Aware UI

All buttons/actions that require permissions must be hidden or disabled for
users who don't have that permission:

```typescript
// hooks/usePermission.ts
export const usePermission = (permission: Permission) => {
  const { membership } = useCurrentMembership();
  return ROLE_PERMISSIONS[membership?.role ?? 'viewer'].has(permission);
};

// Usage
const canPublish = usePermission(Permission.PUBLISH_VERSION);
// <Button disabled={!canPublish}>Publish Version</Button>
```

---

## Files to Create

### Backend (Antigravity)
- `backend/app/models/invitation.py`
- `backend/app/api/members.py`
- `backend/app/api/invitations.py`
- `backend/app/core/permissions.py`
- `backend/app/services/email.py` — send invite emails
- `backend/migrations/versions/XXXX_add_invitations.py`

### Frontend (Codex)
- `features/settings/TeamPage.tsx`
- `features/settings/InviteModal.tsx`
- `features/settings/MemberCard.tsx`
- `pages/InviteAcceptPage.tsx` — public, /invite/{token}
- `lib/auth/permissions.ts` — permission constants + hook
- `hooks/usePermission.ts`

---

## Done Criteria

- [ ] Admin can invite members by email with role selection
- [ ] Invite email is sent with working accept link
- [ ] Accept link auto-joins the user to the org (creates account if needed)
- [ ] Admin can change a member's role
- [ ] Admin can remove a member
- [ ] Permission system enforced on backend (403 for unauthorized actions)
- [ ] Frontend hides/disables buttons based on current user's role
- [ ] Viewer cannot see edit buttons, run solver, or publish
- [ ] Editor cannot see publish, share link, or org management
