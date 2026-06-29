import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  children?: { label: string; path: string; icon: string }[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  {
    label: 'Resources',
    path: '/resources',
    icon: 'inventory_2',
    children: [
      { label: 'Teachers', path: '/resources/teachers', icon: 'school' },
      { label: 'Rooms', path: '/resources/rooms', icon: 'meeting_room' },
      { label: 'Subjects', path: '/resources/subjects', icon: 'menu_book' },
      { label: 'Sections', path: '/resources/sections', icon: 'groups' },
    ],
  },
  { label: 'Timetable', path: '/timetable', icon: 'calendar_month' },
  { label: 'Canvas View', path: '/canvas', icon: 'hub' },
  { label: 'Solver Engine', path: '/solver', icon: 'precision_manufacturing' },
  { label: 'Version History', path: '/versions', icon: 'history' },
  { label: 'Settings', path: '/settings', icon: 'settings' },
  { label: 'Profile', path: '/profile', icon: 'account_circle' },
];

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

export default function Sidebar({ expanded, onToggle }: SidebarProps) {
  const location = useLocation();
  const { theme } = useTheme();
  const [resourcesOpen, setResourcesOpen] = useState(
    location.pathname.startsWith('/resources')
  );

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (path: string) => location.pathname.startsWith(path);

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
              Institutional Admin
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
        <div className="space-y-0.5">
          {navItems.map((item) => {
            if (item.children) {
              return (
                <div key={item.label}>
                  <button
                    onClick={() => expanded && setResourcesOpen(!resourcesOpen)}
                    title={expanded ? undefined : item.label}
                    className={`sidebar-nav-item w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-sm transition-all duration-150 ${
                      isParentActive(item.path)
                        ? 'bg-accent-soft text-primary font-semibold'
                        : 'text-on-surface-variant hover:bg-accent-soft/50'
                    }`}
                  >
                    <div className={`flex items-center ${expanded ? 'gap-3' : 'justify-center'}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        {item.icon}
                      </span>
                      {expanded && <span>{item.label}</span>}
                    </div>
                    {expanded && <span
                      className={`material-symbols-outlined transition-transform duration-200 ${
                        resourcesOpen ? 'rotate-180' : ''
                      }`}
                      style={{ fontSize: 18 }}
                    >
                      expand_more
                    </span>}
                  </button>
                  {expanded && <div
                    className={`overflow-hidden transition-all duration-200 ${
                      resourcesOpen ? 'max-h-60 opacity-100 mt-0.5' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="ml-4 border-l-2 border-rule pl-2 space-y-0.5">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`sidebar-nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                            isActive(child.path)
                              ? 'bg-accent-soft text-primary font-semibold border-l-[3px] border-primary -ml-[11px] pl-[14px]'
                              : 'text-on-surface-variant hover:bg-accent-soft/50 hover:text-on-surface'
                          }`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                            {child.icon}
                          </span>
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                title={expanded ? undefined : item.label}
                className={`sidebar-nav-item flex items-center ${expanded ? 'gap-3 px-3' : 'justify-center px-2'} py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive(item.path)
                    ? 'bg-accent-soft text-primary font-semibold border-l-[3px] border-primary'
                    : 'text-on-surface-variant hover:bg-accent-soft/50 hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  {item.icon}
                </span>
                {expanded && <span>{item.label}</span>}
              </Link>
            );
          })}
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
      </div>
    </aside>
  );
}
