import { useEffect, useState, type CSSProperties } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';

export default function AppLayout() {
  const location = useLocation();
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    return localStorage.getItem('slotforge_sidebar_expanded') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('slotforge_sidebar_expanded', String(sidebarExpanded));
  }, [sidebarExpanded]);

  return (
    <div className="app-shell h-screen overflow-hidden">
      <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded((expanded) => !expanded)} />
      <div
        className={`flex h-screen min-w-0 flex-col overflow-hidden transition-[margin] duration-200 ease-out ${sidebarExpanded ? 'ml-64' : 'ml-20'}`}
        style={{ '--slotforge-sidebar-offset': sidebarExpanded ? '16rem' : '5rem' } as CSSProperties & Record<string, string>}
      >
        <TopBar />
        <main className="app-main min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-margin-page">
          <div key={location.pathname} className="route-transition">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
