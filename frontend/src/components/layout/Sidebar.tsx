import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

interface SidebarLink {
  label: string;
  path: string;
  icon: string;
}

const resourceLinks: SidebarLink[] = [
  { label: 'Teachers', path: '/resources/teachers', icon: 'person' },
  { label: 'Rooms', path: '/resources/rooms', icon: 'meeting_room' },
  { label: 'Subjects', path: '/resources/subjects', icon: 'menu_book' },
  { label: 'Sections', path: '/resources/sections', icon: 'groups' },
];

const primaryLinks: SidebarLink[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { label: 'Timetable', path: '/timetable', icon: 'calendar_month' },
  { label: 'Faculty', path: '/faculty', icon: 'badge' },
  { label: 'Heatmap', path: '/heatmap', icon: 'ssid_chart' },
  { label: 'Canvas View', path: '/canvas', icon: 'hub' },
  { label: 'Solver Engine', path: '/solver', icon: 'precision_manufacturing' },
  { label: 'Version History', path: '/versions', icon: 'history' },
  { label: 'Settings', path: '/settings', icon: 'settings' },
];

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

function SidebarNavLink({ item, expanded, inset = false }: { item: SidebarLink; expanded: boolean; inset?: boolean }) {
  return (
    <NavLink
      to={item.path}
      title={expanded ? undefined : item.label}
      className={({ isActive }) => [
        'sidebar-nav-item group flex items-center rounded-lg text-sm font-semibold transition-colors duration-150',
        expanded ? 'gap-3 px-3 py-2.5' : 'justify-center px-2 py-2.5',
        inset && expanded ? 'ml-3' : '',
        isActive ? 'is-active text-primary' : 'text-on-surface-variant hover:text-on-surface',
      ].filter(Boolean).join(' ')}
    >
      <span className="material-symbols-outlined shrink-0" style={{ fontSize: 20 }}>
        {item.icon}
      </span>
      {expanded && (
        <span className="min-w-0 flex-1 truncate">
          {item.label}
        </span>
      )}
    </NavLink>
  );
}

export default function Sidebar({ expanded, onToggle }: SidebarProps) {
  const location = useLocation();
  const { theme } = useTheme();
  const [resourcesOpen, setResourcesOpen] = useState(true);
  const resourcesActive = location.pathname.startsWith('/resources');

  const logoSrc = theme === 'dark'
    ? (expanded ? '/logo/logo-dark.svg' : '/logo/logo-symbol-dark.svg')
    : (expanded ? '/logo/logo.svg' : '/logo/logo-symbol.svg');

  return (
    <aside className={`sidebar-shell slotforge-sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r-2 border-rule bg-paper-raised transition-[width] duration-200 ease-out ${expanded ? 'w-64' : 'w-20'}`}>
      <div className={`${expanded ? 'px-5' : 'px-3'} shrink-0 border-b border-rule py-4`}>
        <div className={`flex items-center ${expanded ? 'justify-between gap-3' : 'justify-center'}`}>
          <Link to="/dashboard" className={`flex min-w-0 items-center ${expanded ? 'gap-3' : 'justify-center'}`} title="SlotForge dashboard">
            <img src={logoSrc} alt="SlotForge Logo" className="brand-mark h-9 w-9 object-contain" />
            {expanded && (
              <div className="min-w-0">
                <h1 className="truncate text-[15px] font-semibold text-on-surface" style={{ fontFamily: 'var(--font-display)' }}>
                  SlotForge
                </h1>
                <p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>
                  Schedule Console
                </p>
              </div>
            )}
          </Link>

          {expanded && (
            <button
              type="button"
              onClick={onToggle}
              className="topbar-action rounded-lg p-1.5 text-on-surface-variant hover:bg-accent-soft hover:text-primary"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>keyboard_double_arrow_left</span>
            </button>
          )}
        </div>

        {!expanded && (
          <button
            type="button"
            onClick={onToggle}
            className="mt-4 flex w-full items-center justify-center rounded-lg p-2 text-on-surface-variant hover:bg-accent-soft hover:text-primary"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>keyboard_double_arrow_right</span>
          </button>
        )}
      </div>

      <nav className={`${expanded ? 'px-3' : 'px-2'} flex-1 overflow-y-auto overflow-x-hidden py-3`} aria-label="Primary navigation">
        <div className="space-y-5">
          <div className="space-y-1">
            <SidebarNavLink item={primaryLinks[0]} expanded={expanded} />
          </div>

          <div>
            {expanded ? (
              <button
                type="button"
                onClick={() => setResourcesOpen(open => !open)}
                className={[
                  'sidebar-group-trigger mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
                  resourcesActive ? 'text-primary' : 'text-on-surface-variant hover:bg-accent-soft/60 hover:text-on-surface',
                ].join(' ')}
                aria-expanded={resourcesOpen}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="material-symbols-outlined shrink-0" style={{ fontSize: 20 }}>inventory_2</span>
                  <span className="truncate">Resources</span>
                </span>
                <span
                  className={`material-symbols-outlined shrink-0 transition-transform duration-200 ${resourcesOpen ? 'rotate-180' : ''}`}
                  style={{ fontSize: 18 }}
                >
                  expand_more
                </span>
              </button>
            ) : (
              <div className="mx-auto mb-2 h-px w-8 bg-rule" />
            )}

            <div className={`space-y-1 overflow-hidden transition-[max-height,opacity] duration-200 ${expanded && !resourcesOpen ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'}`}>
              {resourceLinks.map(item => (
                <SidebarNavLink key={item.path} item={item} expanded={expanded} inset />
              ))}
            </div>
          </div>

          <div className="space-y-1 border-t border-rule pt-4">
            {primaryLinks.slice(1).map(item => (
              <SidebarNavLink key={item.path} item={item} expanded={expanded} />
            ))}
          </div>
        </div>
      </nav>

      <div className={`${expanded ? 'px-3' : 'px-2'} shrink-0 space-y-2 border-t border-rule bg-paper-raised pb-4 pt-3`}>
        <Link
          to="/solver"
          title={expanded ? undefined : 'Generate Schedule'}
          className={`control-motion flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-on-primary transition-colors duration-150 hover:bg-primary-container ${expanded ? 'px-4' : 'px-2'}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            play_circle
          </span>
          {expanded && <span className="truncate">Generate Schedule</span>}
        </Link>

        <Link
          to="/profile"
          title={expanded ? undefined : 'Profile'}
          className={`sidebar-nav-item flex items-center rounded-lg py-2 text-on-surface-variant hover:text-on-surface ${expanded ? 'gap-3 px-3' : 'justify-center px-2'}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>account_circle</span>
          {expanded && <span className="truncate text-sm font-semibold">Profile</span>}
        </Link>
      </div>
    </aside>
  );
}
