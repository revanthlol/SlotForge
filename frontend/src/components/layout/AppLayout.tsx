import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
  const location = useLocation();
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    return localStorage.getItem('slotforge_sidebar_expanded') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('slotforge_sidebar_expanded', String(sidebarExpanded));
  }, [sidebarExpanded]);

  return (
    <div className="app-shell min-h-screen">
      <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded((expanded) => !expanded)} />
      <div className={`transition-[margin] duration-200 ease-out ${sidebarExpanded ? 'ml-64' : 'ml-20'}`}>
        <TopBar />
        <main className="app-main p-margin-page min-h-[calc(100vh-56px)]">
          <div key={location.pathname} className="route-transition">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
