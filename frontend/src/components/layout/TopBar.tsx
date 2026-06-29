import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useOrganization } from '../../hooks/useApi';

export default function TopBar() {
  const { organizationId, signOut, fullName, role, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: org } = useOrganization(organizationId);
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const initials = (fullName || user?.email || 'Admin')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'A';

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const handleSignOut = async () => {
    setAccountOpen(false);
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <header className="topbar-shell h-14 bg-paper-raised border-b-2 border-rule flex items-center justify-between px-6 sticky top-0 z-40">
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

      <div className="flex items-center gap-1">
        <button
          className="topbar-action p-2 rounded-lg hover:bg-accent-soft transition-colors"
          title="Sync data"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>
            sync
          </span>
        </button>
        <button
          className="topbar-action p-2 rounded-lg hover:bg-accent-soft transition-colors"
          title="Notifications"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>
            notifications
          </span>
        </button>
        <button
          className="topbar-action p-2 rounded-lg hover:bg-accent-soft transition-colors"
          title="Help"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>
            help_outline
          </span>
        </button>
        <button
          onClick={toggleTheme}
          className="topbar-action p-2 rounded-lg hover:bg-accent-soft transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        <div className="w-px h-6 bg-rule mx-2" />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setAccountOpen((open) => !open)}
            className="topbar-action flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent-soft transition-colors"
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            title={fullName || 'Account'}
          >
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shadow-sm">
              <span className="text-xs font-black text-on-primary-container" style={{ fontFamily: 'var(--font-mono)' }}>
                {initials}
              </span>
            </div>
            <div className="hidden min-w-0 text-left md:block">
              <p className="max-w-28 truncate text-sm font-semibold text-on-surface">{fullName || 'Admin'}</p>
              <p className="text-[10px] uppercase tracking-wider text-mono-grey">{role || 'admin'}</p>
            </div>
            <span className={`material-symbols-outlined text-on-surface-variant transition-transform ${accountOpen ? 'rotate-180' : ''}`} style={{ fontSize: 18 }}>
              expand_more
            </span>
          </button>

          {accountOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-72 overflow-hidden rounded-xl border-2 border-rule bg-paper-raised shadow-2xl"
            >
              <div className="border-b border-rule bg-surface-container-low p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-black text-on-primary">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-on-surface">{fullName || 'Admin'}</p>
                    <p className="truncate text-xs text-mono-grey">{user?.email || 'No email'}</p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    navigate('/profile');
                  }}
                  role="menuitem"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-accent-soft hover:text-primary"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 19 }}>account_circle</span>
                  View Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    navigate('/settings');
                  }}
                  role="menuitem"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-accent-soft hover:text-primary"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 19 }}>settings</span>
                  Institution Settings
                </button>
              </div>

              <div className="border-t border-rule p-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  role="menuitem"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-error hover:bg-error-container"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 19 }}>logout</span>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
