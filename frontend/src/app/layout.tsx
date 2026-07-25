import { useEffect, useState, type CSSProperties } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';
import MobileExperienceGate from '../components/layout/MobileExperienceGate';

const MOBILE_GATE_QUERY = '(max-width: 899px), (pointer: coarse) and (orientation: portrait)';

function useMobileGate() {
  const [blocked, setBlocked] = useState(() => window.matchMedia(MOBILE_GATE_QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_GATE_QUERY);
    const update = () => setBlocked(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return blocked;
}

export default function AppLayout() {
  const location = useLocation();
  const mobileBlocked = useMobileGate();
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    return localStorage.getItem('slotforge_sidebar_expanded') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('slotforge_sidebar_expanded', String(sidebarExpanded));
  }, [sidebarExpanded]);

  if (mobileBlocked) return <MobileExperienceGate />;

  return (
    <div className="app-shell h-screen overflow-hidden">
      <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded((expanded) => !expanded)} />
      <div
        className={`flex h-screen min-w-0 flex-col overflow-hidden transition-[margin] duration-200 ease-out ${sidebarExpanded ? 'ml-64' : 'ml-20'}`}
        style={{ '--slotforge-sidebar-offset': sidebarExpanded ? '16rem' : '5rem' } as CSSProperties & Record<string, string>}
      >
        <TopBar />
        <main className="app-main min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-margin-page">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="h-full w-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

