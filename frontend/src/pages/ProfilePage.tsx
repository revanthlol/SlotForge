import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../hooks/useApi';

export default function ProfilePage() {
  const { user, organizationId, role, fullName } = useAuth();
  const { data: organization } = useOrganization(organizationId);
  const initials = (fullName || user?.email || 'Admin')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'A';

  return (
    <div className="space-y-8">
      <div className="page-header-animate">
        <p className="text-label-caps text-mono-grey mb-3">Account / Profile</p>
        <h1 className="text-display-xl text-on-surface mb-2">Profile</h1>
        <p className="text-body-lg text-on-surface-variant">
          Manage your account identity and confirm the active institution context.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="bg-paper-raised border-2 border-rule rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-on-primary shadow-sm">
              {initials}
            </div>
            <div>
              <p className="text-label-caps text-secondary mb-2">Signed In</p>
              <h2 className="text-2xl font-semibold text-on-surface" style={{ fontFamily: 'var(--font-display)' }}>
                {fullName || 'Admin User'}
              </h2>
              <p className="text-sm text-mono-grey">{user?.email || 'No email available'}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm">
            <div className="rounded-lg border border-rule bg-surface-container-low p-4">
              <p className="text-label-caps text-mono-grey mb-1">Role</p>
              <p className="font-semibold capitalize text-on-surface">{role || 'admin'}</p>
            </div>
            <div className="rounded-lg border border-rule bg-surface-container-low p-4">
              <p className="text-label-caps text-mono-grey mb-1">User ID</p>
              <p className="break-all font-mono text-xs text-on-surface-variant">{user?.id || 'Unavailable'}</p>
            </div>
          </div>
        </div>

        <div className="bg-paper-raised border-2 border-rule rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-rule pb-5">
            <div>
              <p className="text-label-caps text-mono-grey mb-2">Institution</p>
              <h2 className="text-2xl font-semibold text-on-surface" style={{ fontFamily: 'var(--font-display)' }}>
                {organization?.name || 'SlotForge Institution'}
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                This is the active organization used for timetable generation and resource management.
              </p>
            </div>
            <span className="rounded-full border border-primary/20 bg-accent-soft px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              Active
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-rule bg-surface-container-low p-4">
              <p className="text-label-caps text-mono-grey mb-2">Scheduling</p>
              <p className="font-semibold text-on-surface">
                {organization?.scheduling_mode === 'day_order' ? 'Day Order' : 'Fixed Weekday'}
              </p>
            </div>
            <div className="rounded-lg border border-rule bg-surface-container-low p-4">
              <p className="text-label-caps text-mono-grey mb-2">Cycle Length</p>
              <p className="font-semibold text-on-surface">{organization?.cycle_length || 0} days</p>
            </div>
            <div className="rounded-lg border border-rule bg-surface-container-low p-4">
              <p className="text-label-caps text-mono-grey mb-2">Periods</p>
              <p className="font-semibold text-on-surface">{organization?.periods_per_day || 0} per day</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-secondary/20 bg-signal-soft p-4">
            <p className="text-sm font-semibold text-on-surface">Profile editing is intentionally limited for now.</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Account identity is sourced from authentication plus the organization profile. Settings that affect scheduling should stay in the Settings page.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
