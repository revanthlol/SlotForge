import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../hooks/useApi';

export default function TopBar() {
  const { organizationId, signOut } = useAuth();
  const { data: org } = useOrganization(organizationId);

  return (
    <header className="h-14 bg-paper-raised border-b-2 border-rule flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Left: Organization badge */}
      <div className="flex items-center gap-3">
        <span
          className="text-label-caps text-secondary"
          style={{ fontSize: 11 }}
        >
          {org?.name || 'SlotForge'}
        </span>
        <span className="text-outline-variant">|</span>
        <span className="text-data-table text-mono-grey">
          {org?.scheduling_mode === 'day_order' ? 'Day-Order' : 'Fixed Weekday'} · {org?.periods_per_day || 0} periods
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <button
          className="p-2 rounded-lg hover:bg-accent-soft transition-colors"
          title="Sync data"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>
            sync
          </span>
        </button>
        <button
          className="p-2 rounded-lg hover:bg-accent-soft transition-colors"
          title="Notifications"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>
            notifications
          </span>
        </button>
        <button
          className="p-2 rounded-lg hover:bg-accent-soft transition-colors"
          title="Help"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>
            help_outline
          </span>
        </button>
        <div className="w-px h-6 bg-rule mx-2" />
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent-soft transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-container" style={{ fontSize: 16 }}>
              person
            </span>
          </div>
          <span className="text-sm text-on-surface-variant">Admin</span>
        </button>
      </div>
    </header>
  );
}
