import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ShortcutProvider } from './contexts/ShortcutContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AppLayout from './components/layout/AppLayout';

// Page imports
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import TeachersPage from './pages/TeachersPage';
import RoomsPage from './pages/RoomsPage';
import SubjectsPage from './pages/SubjectsPage';
import SectionsPage from './pages/SectionsPage';
import TimetablePage from './pages/TimetablePage';
import CanvasViewPage from './pages/CanvasViewPage';
import SolverEnginePage from './pages/SolverEnginePage';
import VersionHistoryPage from './pages/VersionHistoryPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import OnboardingPage from './pages/OnboardingPage';

function ProtectedRoute({ children }: { children: React.JSX.Element }) {
  const { organizationId, loading } = useAuth();
  const location = useLocation();

  if (loading) {
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

  // Check if we have organizationId (implies signed up/in successfully)
  if (!organizationId) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return children;
}

function PublicAuthRoute({ children }: { children: React.JSX.Element }) {
  const { organizationId, loading } = useAuth();

  if (loading) {
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

  if (organizationId) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<PublicAuthRoute><LoginPage /></PublicAuthRoute>} />
            <Route path="/signup" element={<PublicAuthRoute><SignupPage /></PublicAuthRoute>} />

            {/* Protected Application Routes */}
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
              
              {/* Resources Sub-routes */}
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

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
