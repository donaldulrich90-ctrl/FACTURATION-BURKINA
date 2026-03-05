import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import PwaInstallBanner from './components/PwaInstallBanner';
import Login from './pages/Login';
import SuperAdmin from './pages/SuperAdmin';
import CompanyAdmin from './pages/CompanyAdmin';
import Facturation from './pages/Facturation';
import Quittances from './pages/Quittances';

function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-faso-bg-light"><div className="animate-spin w-10 h-10 border-2 border-faso-primary border-t-transparent rounded-full" /></div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    if (currentUser.role === 'super_admin') return <Navigate to="/admin" replace />;
    if (currentUser.role === 'company_admin') return <Navigate to="/company" replace />;
    return <Navigate to="/app" replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-faso-bg-light"><div className="animate-spin w-10 h-10 border-2 border-faso-primary border-t-transparent rounded-full" /></div>;
  if (currentUser) {
    if (currentUser.role === 'super_admin') return <Navigate to="/admin" replace />;
    if (currentUser.role === 'company_admin') return <Navigate to="/company" replace />;
    return <Navigate to="/app" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <PwaInstallBanner />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company"
          element={
            <ProtectedRoute allowedRoles={['company_admin']}>
              <CompanyAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app"
          element={
            <ProtectedRoute allowedRoles={['company_admin', 'company_user', 'super_admin']}>
              <Facturation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quittances"
          element={
            <ProtectedRoute allowedRoles={['company_admin', 'company_user']}>
              <Quittances />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
