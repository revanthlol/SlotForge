import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useOrganization, useOrganizations } from '../../hooks/useApi';
import Modal from '../ui/Modal';

export default function TopBar() {
  const { organizationId, signOut, fullName, role, user, switchOrganization, createOrganization } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: org } = useOrganization(organizationId);
  const { data: organizations, refetch: refetchOrganizations } = useOrganizations(Boolean(organizationId));
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [orgSaving, setOrgSaving] = useState(false);
  const orgMenuRef = useRef<HTMLDivElement | null>(null);
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
      if (!orgMenuRef.current?.contains(event.target as Node)) {
        setOrgMenuOpen(false);
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

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    setOrgSaving(true);
    try {
      await createOrganization(newOrgName.trim());
      await refetchOrganizations();
      setCreateOrgOpen(false);
      setNewOrgName('');
      navigate('/onboarding');
    } finally {
      setOrgSaving(false);
    }
  };

  const handleSwitchOrg = async (nextOrgId: string) => {
    if (nextOrgId === organizationId) return;
    setOrgMenuOpen(false);
    await switchOrganization(nextOrgId);
    navigate('/dashboard');
  };

  return (
    <header className="topbar-shell h-14 bg-paper-raised border-b-2 border-rule flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="relative" ref={orgMenuRef}>
          <button
            type="button"
            onClick={() => setOrgMenuOpen(open => !open)}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-label-caps text-secondary hover:bg-accent-soft"
            style={{ fontSize: 11 }}
          >
            {org?.name || 'SlotForge'}
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>expand_more</span>
          </button>
          {orgMenuOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border-2 border-rule bg-paper-raised shadow-2xl">
              <div className="border-b border-rule bg-surface-container-low px-4 py-3">
                <p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>Organizations</p>
              </div>
              <div className="max-h-72 overflow-auto p-2">
                {(organizations || []).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSwitchOrg(item.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${
                      item.id === organizationId ? 'bg-accent-soft text-primary' : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <span className="truncate">{item.name}</span>
                    {item.id === organizationId && <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>}
                  </button>
                ))}
              </div>
              <div className="border-t border-rule p-2">
                <button
                  type="button"
                  onClick={() => {
                    setOrgMenuOpen(false);
                    setCreateOrgOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:bg-accent-soft"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 19 }}>add_business</span>
                  Create organization
                </button>
              </div>
            </div>
          )}
        </div>
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

      <Modal
        open={createOrgOpen}
        onClose={() => !orgSaving && setCreateOrgOpen(false)}
        title="Create organization"
        maxWidth="max-w-lg"
        actions={
          <>
            <button
              type="button"
              onClick={() => setCreateOrgOpen(false)}
              disabled={orgSaving}
              className="px-4 py-2 text-sm text-on-surface-variant border border-rule rounded-lg hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateOrg}
              disabled={orgSaving || !newOrgName.trim()}
              data-modal-primary="true"
              className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {orgSaving ? 'Creating...' : 'Create & Set Up'}
            </button>
          </>
        }
      >
        <div>
          <label className="text-label-caps text-on-surface-variant block mb-2" style={{ fontSize: 10 }}>Organization Name</label>
          <input
            value={newOrgName}
            onChange={(event) => setNewOrgName(event.target.value)}
            className="academic-input w-full"
            placeholder="New institution or department"
            autoFocus
          />
          <p className="mt-2 text-sm text-on-surface-variant">
            This creates a clean organization with its own resources, timetable versions, and setup checklist.
          </p>
        </div>
      </Modal>
    </header>
  );
}
