import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ShortcutProvider } from './contexts/ShortcutContext';
import AppLayout from './components/layout/AppLayout';

// Page imports
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

function ProtectedRoute({ children }: { children: React.JSX.Element }) {
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

  // Check if we have organizationId (implies signed up/in successfully)
  if (!organizationId) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ShortcutProvider>
                  <AppLayout />
                </ShortcutProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            
            {/* Resources Sub-routes */}
            <Route path="resources">
              <Route index element={<Navigate to="teachers" replace />} />
              <Route path="teachers" element={<TeachersPage />} />
              <Route path="rooms" element={<RoomsPage />} />
              <Route path="subjects" element={<SubjectsPage />} />
              <Route path="sections" element={<SectionsPage />} />
            </Route>

            <Route path="timetable" element={<TimetablePage />} />
            <Route path="canvas" element={<CanvasViewPage />} />
            <Route path="solver" element={<SolverEnginePage />} />
            <Route path="versions" element={<VersionHistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
