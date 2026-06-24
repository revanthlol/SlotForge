import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { AuthProvider } from './store/authContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './components/pages/auth/LoginPage';
import DashboardPage from './components/pages/dashboard/DashboardPage';
import TeachersPage from './components/pages/teachers/TeachersPage';
import RoomsPage from './components/pages/rooms/RoomsPage';
import SubjectsPage from './components/pages/subjects/SubjectsPage';
import SectionsPage from './components/pages/sections/SectionPage';
import ConstraintsPage from './components/pages/constraints/ConstraintsPage';
import TimetablePage from './components/pages/timetable/TimetablePage';
import CanvasPage from './components/pages/timetable/CanvasPage';
import GeneratePage from './components/pages/timetable/GeneratePage';

const ANT_THEME = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#6366f1',
    colorBgBase: '#0a0f1e',
    colorBgContainer: '#0f172a',
    colorBgElevated: '#1e293b',
    colorBorder: '#1e293b',
    colorText: '#f1f5f9',
    colorTextSecondary: '#94a3b8',
    borderRadius: 8,
    fontFamily: "'Inter', sans-serif",
    colorLink: '#818cf8',
    colorLinkHover: '#a5b4fc',
  },
};

export default function App() {
  return (
    <ConfigProvider theme={ANT_THEME}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="teachers" element={<TeachersPage />} />
              <Route path="rooms" element={<RoomsPage />} />
              <Route path="subjects" element={<SubjectsPage />} />
              <Route path="sections" element={<SectionsPage />} />
              <Route path="constraints" element={<ConstraintsPage />} />
              <Route path="timetable" element={<TimetablePage />} />
              <Route path="canvas" element={<CanvasPage />} />
              <Route path="generate" element={<GeneratePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}
