import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Resources', path: '/resources/teachers', icon: 'inventory_2' },
      { label: 'Tasks', path: '/resources/subjects', icon: 'checklist' },
      { label: 'Groups', path: '/resources/sections', icon: 'groups' },
      { label: 'Locations', path: '/resources/rooms', icon: 'meeting_room' },
    ],
  },
  {
    label: 'Schedule',
    items: [
      { label: 'Solver Engine', path: '/solver', icon: 'precision_manufacturing' },
      { label: 'Timetable', path: '/timetable', icon: 'calendar_month' },
      { label: 'Faculty View', path: '/timetable', icon: 'school' },
      { label: 'Version History', path: '/versions', icon: 'history' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Constraint Playground', path: '/solver', icon: 'rule_settings' },
      { label: 'Conflict Heatmap', path: '/solver', icon: 'grid_view' },
      { label: 'Canvas Map', path: '/canvas', icon: 'hub' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Presets', path: '/settings', icon: 'tune' },
      { label: 'Multi-user', path: '/settings', icon: 'group_add' },
      { label: 'Exports', path: '/settings', icon: 'ios_share' },
    ],
  },
];

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

export default function Sidebar({ expanded, onToggle }: SidebarProps) {
  const location = useLocation();
  const { theme } = useTheme();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    return navGroups.reduce<Record<string, boolean>>((acc, group) => {
      acc[group.label] = true;
      return acc;
    }, {});
  });

  const isActive = (item: NavItem) => {
    if (item.exact) return location.pathname === item.path;
    if (item.path.startsWith('/resources')) return location.pathname === item.path;
    return location.pathname === item.path;
  };

  const toggleGroup = (label: string) => {
    if (!expanded) return;
    setOpenGroups((groups) => ({ ...groups, [label]: !groups[label] }));
  };

  const logoSrc = theme === 'dark'
    ? (expanded ? '/logo/logo-dark.svg' : '/logo/logo-symbol-dark.svg')
    : (expanded ? '/logo/logo.svg' : '/logo/logo-symbol.svg');

  return (
    <aside className={`sidebar-shell fixed left-0 top-0 h-screen bg-paper-raised border-r-2 border-rule flex flex-col z-50 transition-[width] duration-200 ease-out ${expanded ? 'w-64' : 'w-20'}`}>
      {/* Logo */}
      <div className={`${expanded ? 'px-5' : 'px-3'} py-5 border-b border-rule`}>
        <div className={`flex items-center ${expanded ? 'justify-between gap-3' : 'justify-center'}`}>
          <div className="flex min-w-0 items-center gap-3">
          <img src={logoSrc} alt="SlotForge Logo" className="brand-mark w-9 h-9 object-contain" />
          {expanded && (
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-on-surface tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              SlotForge
            </h1>
            <p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>
              Workspace Console
            </p>
          </div>
          )}
          </div>
          {expanded && (
            <button
              type="button"
              onClick={onToggle}
              className="topbar-action rounded-lg p-1.5 text-on-surface-variant hover:bg-accent-soft hover:text-primary"
              title="Collapse sidebar"
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
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>keyboard_double_arrow_right</span>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={`${expanded ? 'px-3' : 'px-2'} flex-1 overflow-hidden py-3`}>
        <div className="space-y-4">
          <Link
            to="/dashboard"
            title={expanded ? undefined : 'Dashboard'}
            className={`sidebar-nav-item flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-sm transition-all duration-150 ${
              location.pathname === '/dashboard'
                ? 'bg-accent-soft text-primary font-semibold border-l-[3px] border-primary'
                : 'text-on-surface-variant hover:bg-accent-soft/50 hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>dashboard</span>
            {expanded && <span>Dashboard</span>}
          </Link>

          {navGroups.map((group) => (
            <div key={group.label}>
              {expanded ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className="mb-1 flex w-full items-center justify-between px-3 py-1 text-label-caps text-mono-grey hover:text-on-surface"
                  style={{ fontSize: 9 }}
                >
                  <span>{group.label}</span>
                  <span
                    className={`material-symbols-outlined transition-transform duration-200 ${openGroups[group.label] ? 'rotate-180' : ''}`}
                    style={{ fontSize: 16 }}
                  >
                    expand_more
                  </span>
                </button>
              ) : (
                <div className="mx-auto mb-2 h-px w-8 bg-rule" />
              )}

              <div
                className={`space-y-0.5 overflow-hidden transition-all duration-200 ${
                  expanded && !openGroups[group.label] ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
                }`}
              >
                {group.items.map((item) => (
              <Link
                key={`${group.label}-${item.label}-${item.path}`}
                to={item.path}
                title={expanded ? undefined : item.label}
                className={`sidebar-nav-item flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive(item)
                    ? 'bg-accent-soft text-primary font-semibold border-l-[3px] border-primary'
                    : 'text-on-surface-variant hover:bg-accent-soft/50 hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  {item.icon}
                </span>
                {expanded && <span>{item.label}</span>}
              </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom actions */}
      <div className={`${expanded ? 'px-3' : 'px-2'} pb-4 space-y-2`}>
        <Link
          to="/solver"
          title={expanded ? undefined : 'Generate Schedule'}
          className={`control-motion flex items-center justify-center gap-2 w-full ${expanded ? 'px-4' : 'px-2'} py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors duration-150`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            play_circle
          </span>
          {expanded && 'Generate Schedule'}
        </Link>
        <div className={`flex items-center ${expanded ? 'gap-2 px-3 justify-start' : 'justify-center px-0'} py-2 text-xs text-mono-grey`}>
          <div className="w-2 h-2 bg-primary rounded-full" />
          {expanded && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>Engine Ready</span>}
        </div>
        <div className={`flex items-center ${expanded ? 'justify-between px-2' : 'flex-col gap-1'} border-t border-rule pt-3`}>
          <Link
            to="/profile"
            title="Profile"
            className={`topbar-action flex items-center ${expanded ? 'gap-2 px-2' : 'justify-center'} rounded-lg py-2 text-on-surface-variant hover:bg-accent-soft hover:text-primary ${expanded ? 'min-w-0 flex-1' : 'w-full'}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>account_circle</span>
            {expanded && <span className="truncate text-sm font-semibold">Profile</span>}
          </Link>
          <button
            type="button"
            title="Notifications"
            className={`topbar-action rounded-lg p-2 text-on-surface-variant hover:bg-accent-soft hover:text-primary ${expanded ? '' : 'w-full'}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
