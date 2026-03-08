import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import PwaInstallBanner from './components/PwaInstallBanner';
import AssistantWidget from './components/AssistantWidget';

const Login = lazy(() => import('./pages/Login'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));
const CompanyAdmin = lazy(() => import('./pages/CompanyAdmin'));
const Facturation = lazy(() => import('./pages/Facturation'));
const Quittances = lazy(() => import('./pages/Quittances'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-faso-bg-light">
    <div className="animate-spin w-10 h-10 border-2 border-faso-primary border-t-transparent rounded-full" />
  </div>
);

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
              <Suspense fallback={<PageLoader />}>
                <Login />
              </Suspense>
            </PublicRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <Suspense fallback={<PageLoader />}>
                <SuperAdmin />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/company"
          element={
            <ProtectedRoute allowedRoles={['company_admin']}>
              <Suspense fallback={<PageLoader />}>
                <CompanyAdmin />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app"
          element={
            <ProtectedRoute allowedRoles={['company_admin', 'company_user', 'super_admin']}>
              <Suspense fallback={<PageLoader />}>
                <Facturation />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quittances"
          element={
            <ProtectedRoute allowedRoles={['company_admin', 'company_user']}>
              <Suspense fallback={<PageLoader />}>
                <Quittances />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <AssistantWidget />
    </BrowserRouter>
  );
}
