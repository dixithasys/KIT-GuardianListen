import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';

import PublicHome from './pages/PublicHome';
import Admissions from './pages/Admissions';
import Login from './pages/Login';
import StudentHome from './pages/StudentHome';
import AcademicGuardian from './pages/AcademicGuardian';
import Requests from './pages/Requests';
import Placements from './pages/Placements';
import TeacherHome from './pages/TeacherHome';
import Approvals from './pages/Approvals';
import TeacherClasses from './pages/TeacherClasses';
import History from './pages/History';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={role === 'teacher' ? '/teacher' : '/student'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <main style={{ flex: 1, paddingBottom: 48 }}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<PublicHome />} />
                <Route path="/admissions" element={<Admissions />} />
                <Route path="/login" element={<Login />} />

                {/* Student Protected Routes */}
                <Route
                  path="/student"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <StudentHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/academic-guardian"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <AcademicGuardian />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/requests"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <Requests />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/placements"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <Placements />
                    </ProtectedRoute>
                  }
                />

                {/* Teacher Protected Routes */}
                <Route
                  path="/teacher"
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <TeacherHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/approvals"
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <Approvals />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/classes"
                  element={
                    <ProtectedRoute allowedRoles={['teacher']}>
                      <TeacherClasses />
                    </ProtectedRoute>
                  }
                />

                {/* History (Accessible by authenticated users) */}
                <Route
                  path="/history"
                  element={
                    <ProtectedRoute allowedRoles={['student', 'teacher', 'visitor']}>
                      <History />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
