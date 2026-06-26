import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

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
];

export default function Sidebar() {
  const location = useLocation();
  const [resourcesOpen, setResourcesOpen] = useState(
    location.pathname.startsWith('/resources')
  );

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (path: string) => location.pathname.startsWith(path);

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-paper-raised border-r-2 border-rule flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-rule">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary" style={{ fontSize: 20 }}>
              view_module
            </span>
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-on-surface tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              SlotForge
            </h1>
            <p className="text-label-caps text-mono-grey" style={{ fontSize: 9 }}>
              Institutional Admin
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            if (item.children) {
              return (
                <div key={item.label}>
                  <button
                    onClick={() => setResourcesOpen(!resourcesOpen)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                      isParentActive(item.path)
                        ? 'bg-accent-soft text-primary font-semibold'
                        : 'text-on-surface-variant hover:bg-accent-soft/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    <span
                      className={`material-symbols-outlined transition-transform duration-200 ${
                        resourcesOpen ? 'rotate-180' : ''
                      }`}
                      style={{ fontSize: 18 }}
                    >
                      expand_more
                    </span>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      resourcesOpen ? 'max-h-60 opacity-100 mt-0.5' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="ml-4 border-l-2 border-rule pl-2 space-y-0.5">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
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
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive(item.path)
                    ? 'bg-accent-soft text-primary font-semibold border-l-[3px] border-primary'
                    : 'text-on-surface-variant hover:bg-accent-soft/50 hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-4 space-y-2">
        <Link
          to="/solver"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-container transition-colors duration-150"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            play_circle
          </span>
          Generate Schedule
        </Link>
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-mono-grey">
          <div className="w-2 h-2 bg-primary rounded-full" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>Engine Ready</span>
        </div>
      </div>
    </aside>
  );
}
