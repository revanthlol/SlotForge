import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
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

const onboardingFinished = (progress: { skipped?: boolean; completed_steps: string[] }) =>
  Boolean(progress.skipped || progress.completed_steps.includes('generate'));

function ProtectedRoute({ children }: { children: React.JSX.Element }) {
  const { organizationId, loading } = useAuth();
  const location = useLocation();
  const { progress, loading: onboardingLoading, loadedWorkspaceId } = useOnboardingProgress(organizationId);

  if (loading || (organizationId && (onboardingLoading || loadedWorkspaceId !== organizationId))) return <LoadingRouteState />;

  if (!organizationId) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  const isCompletedOrSkipped = onboardingFinished(progress);
  if (!isCompletedOrSkipped && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function PublicAuthRoute({ children }: { children: React.JSX.Element }) {
  const { organizationId, loading } = useAuth();
  const { progress, loading: onboardingLoading, loadedWorkspaceId } = useOnboardingProgress(organizationId);

  if (loading || (organizationId && (onboardingLoading || loadedWorkspaceId !== organizationId))) return <LoadingRouteState />;
  if (organizationId) {
    const isCompletedOrSkipped = onboardingFinished(progress);
    return <Navigate to={isCompletedOrSkipped ? '/' : '/onboarding'} replace />;
  }

  return children;
}

function HomeRoute() {
  const { organizationId, loading } = useAuth();
  const { progress, loading: onboardingLoading, loadedWorkspaceId } = useOnboardingProgress(organizationId);

  if (loading || (organizationId && (onboardingLoading || loadedWorkspaceId !== organizationId))) return <LoadingRouteState />;
  if (!organizationId) return <LandingPage />;
  if (!onboardingFinished(progress)) return <Navigate to="/onboarding" replace />;

  return <ShortcutProvider><AppLayout><DashboardPage /></AppLayout></ShortcutProvider>;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<PublicAuthRoute><LoginPage /></PublicAuthRoute>} />
      <Route path="/signup" element={<PublicAuthRoute><SignupPage /></PublicAuthRoute>} />
      <Route path="/share/faculty/:token" element={<PublicSharePage />} />

      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

      <Route element={<ProtectedRoute><ShortcutProvider><AppLayout /></ShortcutProvider></ProtectedRoute>}>
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
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
  );
}
