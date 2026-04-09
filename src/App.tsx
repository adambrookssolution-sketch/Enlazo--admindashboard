import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './hooks/useAuth';
import { AdminLayout } from './layouts/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ServiceRequestsPage } from './pages/ServiceRequestsPage';
import { QuotesPage } from './pages/QuotesPage';
import { MessagesPage } from './pages/MessagesPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();
  // Show a "recovery" option if loading has been stuck for too long, so the
  // user is never trapped on a blank Cargando screen.
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowRecovery(false);
      return;
    }
    const t = setTimeout(() => setShowRecovery(true), 5000);
    return () => clearTimeout(t);
  }, [isLoading]);

  function handleRecovery() {
    try {
      // Clear all Supabase/admin session keys from both storages.
      const targets = ['localStorage', 'sessionStorage'] as const;
      targets.forEach((storeName) => {
        const store = window[storeName];
        const keys: string[] = [];
        for (let i = 0; i < store.length; i++) {
          const k = store.key(i);
          if (k && (k.startsWith('sb-') || k.includes('supabase') || k.includes('enlazo-admin-auth'))) {
            keys.push(k);
          }
        }
        keys.forEach((k) => store.removeItem(k));
      });
    } catch {}
    window.location.href = '/login';
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 border-4 border-morado-confianza/30 border-t-morado-confianza rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Cargando...</p>
          {showRecovery && (
            <div className="mt-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-600 mb-3">
                ¿La carga está tardando demasiado? Puede ser una sesión en caché.
              </p>
              <button
                onClick={handleRecovery}
                className="px-4 py-2 bg-conexion-profunda text-white text-sm font-medium rounded-lg hover:bg-conexion-profunda/90 transition-colors"
              >
                Reiniciar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-conexion-profunda mb-2">Acceso Denegado</h2>
          <p className="text-gray-500 mb-6">
            No tienes permisos de administrador para acceder a este panel.
          </p>
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-conexion-profunda text-white font-medium rounded-xl hover:bg-conexion-profunda/90 transition-colors"
          >
            Volver al login
          </a>
        </div>
      </div>
    );
  }

  return <AdminLayout>{children}</AdminLayout>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/aprobaciones"
            element={
              <ProtectedRoute>
                <ApprovalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categorias"
            element={
              <ProtectedRoute>
                <CategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/solicitudes"
            element={
              <ProtectedRoute>
                <ServiceRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cotizaciones"
            element={
              <ProtectedRoute>
                <QuotesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mensajes"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resenas"
            element={
              <ProtectedRoute>
                <ReviewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reportes"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analiticas"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
