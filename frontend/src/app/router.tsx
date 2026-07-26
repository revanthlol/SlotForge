import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ShortcutProvider } from '../contexts/ShortcutContext';
import { useAuth } from '../contexts/AuthContext';
import { useOnboardingProgress } from '../features/onboarding/hooks/useOnboardingProgress';
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
import FacultyListPage from '../features/faculty/FacultyListPage';
import PublicSharePage from '../features/faculty/PublicSharePage';
import HeatmapPage from '../features/heatmap/HeatmapPage';
import ConstraintPlaygroundPage from '../features/constraints/ConstraintPlaygroundPage';
import LoadingScreen from '../components/ui/LoadingScreen';

function LoadingRouteState() {
  return <LoadingScreen />;
}

function ProtectedRoute({ children }: { children: React.JSX.Element }) {
  const { organizationId, loading } = useAuth();
  const location = useLocation();
  const { progress, loading: onboardingLoading } = useOnboardingProgress(organizationId);

  if (loading || (organizationId && onboardingLoading)) return <LoadingRouteState />;

  if (!organizationId) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  const isCompletedOrSkipped = progress.skipped || progress.completed_steps.includes('generate');
  if (!isCompletedOrSkipped && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function PublicAuthRoute({ children }: { children: React.JSX.Element }) {
  const { organizationId, loading } = useAuth();
  const { progress, loading: onboardingLoading } = useOnboardingProgress(organizationId);

  if (loading || (organizationId && onboardingLoading)) return <LoadingRouteState />;
  if (organizationId) {
    const isCompletedOrSkipped = progress.skipped || progress.completed_steps.includes('generate');
    return <Navigate to={isCompletedOrSkipped ? '/dashboard' : '/onboarding'} replace />;
  }

  return children;
}

export default function AppRouter() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
    <motion.div
      key={location.pathname}
      initial={reduceMotion ? false : { opacity: 0, y: 10, filter: 'blur(2px)' }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -5, filter: 'blur(1px)' }}
      transition={{ duration: 0.2 }}
      className="route-frame"
    >
    <Routes location={location}>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicAuthRoute><LoginPage /></PublicAuthRoute>} />
      <Route path="/signup" element={<PublicAuthRoute><SignupPage /></PublicAuthRoute>} />
      <Route path="/share/faculty/:token" element={<PublicSharePage />} />

      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

      <Route element={<ProtectedRoute><ShortcutProvider><AppLayout /></ShortcutProvider></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/resources">
          <Route index element={<Navigate to="/resources/teachers" replace />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="sections" element={<SectionsPage />} />
        </Route>
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/faculty" element={<FacultyListPage />} />
        <Route path="/workspace/:workspaceId/faculty" element={<FacultyListPage />} />
        <Route path="/heatmap" element={<HeatmapPage />} />
        <Route path="/canvas" element={<CanvasViewPage />} />
        <Route path="/solver" element={<SolverEnginePage />} />
        <Route path="/constraints" element={<ConstraintPlaygroundPage />} />
        <Route path="/versions" element={<VersionHistoryPage />} />
        <Route path="/workspace/:workspaceId/versions" element={<VersionHistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </motion.div>
    </AnimatePresence>
  );
}
