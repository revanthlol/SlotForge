import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ShortcutProvider } from '../contexts/ShortcutContext';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from './layout';

import LandingPage from '../features/auth/pages/LandingPage';
import LoginPage from '../features/auth/pages/LoginPage';
import SignupPage from '../features/auth/pages/SignupPage';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import TeachersPage from '../features/timetable/pages/TeachersPage';
import RoomsPage from '../features/timetable/pages/RoomsPage';
import SubjectsPage from '../features/timetable/pages/SubjectsPage';
import SectionsPage from '../features/timetable/pages/SectionsPage';
import TimetablePage from '../features/timetable/pages/TimetablePage';
import CanvasViewPage from '../features/canvas/pages/CanvasViewPage';
import SolverEnginePage from '../features/timetable/pages/SolverEnginePage';
import VersionHistoryPage from '../features/versions/pages/VersionHistoryPage';
import SettingsPage from '../features/settings/pages/SettingsPage';
import ProfilePage from '../features/settings/pages/ProfilePage';
import OnboardingPage from '../features/onboarding/pages/OnboardingPage';

function LoadingRouteState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-primary font-mono animate-pulse">
          SlotForge Engine Initializing...
        </p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.JSX.Element }) {
  const { organizationId, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingRouteState />;

  if (!organizationId) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return children;
}

function PublicAuthRoute({ children }: { children: React.JSX.Element }) {
  const { organizationId, loading } = useAuth();

  if (loading) return <LoadingRouteState />;
  if (organizationId) return <Navigate to="/dashboard" replace />;

  return children;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicAuthRoute><LoginPage /></PublicAuthRoute>} />
      <Route path="/signup" element={<PublicAuthRoute><SignupPage /></PublicAuthRoute>} />

      <Route
        element={
          <ProtectedRoute>
            <ShortcutProvider>
              <AppLayout />
            </ShortcutProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/resources">
          <Route index element={<Navigate to="/resources/teachers" replace />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="sections" element={<SectionsPage />} />
        </Route>
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/canvas" element={<CanvasViewPage />} />
        <Route path="/solver" element={<SolverEnginePage />} />
        <Route path="/versions" element={<VersionHistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
