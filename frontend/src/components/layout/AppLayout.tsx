import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="app-shell min-h-screen">
      <Sidebar />
      <div className="ml-64">
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
