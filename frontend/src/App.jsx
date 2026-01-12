import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CompanySettingsProvider } from './contexts/CompanySettingsContext';
import { AlertProvider } from './contexts/AlertContext';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import { FiscalPrinterProvider } from './contexts/FiscalPrinterContext';
import Sidebar from './components/Layout/Sidebar';
import Alert from './components/Alert';
import Login from './pages/Login';

// Pages
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import InvoicesDalese from './pages/InvoicesDalese';
import InvoicesHyrese from './pages/InvoicesHyrese';
import Processing from './pages/Processing';
import Purchase from './pages/Purchase';
import Clients from './pages/Clients';
import Stock from './pages/Stock';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading, canAccessSettings, canAccessReports } = useAuth();
  const location = window.location.pathname;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Duke ngarkuar...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (requireAdmin) {
    if (location === '/settings' && !canAccessSettings()) {
      return <Navigate to="/dashboard" replace />;
    }
    if (location === '/reports' && !canAccessReports()) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

function AppLayout({ children }) {
  const { isOpen, close, toggle } = useSidebar();
  const [collapsed, setCollapsed] = React.useState(() => {
    // Start collapsed on desktop/tablet, expanded on mobile
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // lg breakpoint
    }
    return false;
  });

  return (
    <div className="flex min-h-screen bg-light-bg overflow-x-hidden">
      <Sidebar isOpen={isOpen} onClose={close} collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className={`flex-1 min-w-0 p-3 sm:p-4 md:p-6 transition-all duration-300 ${
        collapsed 
          ? 'lg:ml-[70px]' 
          : 'lg:ml-[260px]'
      }`}>
        {children}
      </main>
      <Alert />
    </div>
  );
}

function AppContent() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Navigate to="/dashboard" replace />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos"
          element={
            <ProtectedRoute>
              <AppLayout>
                <POS />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        {/* Invoice routes - new structure */}
        <Route
          path="/invoices/dalese"
          element={
            <ProtectedRoute>
              <AppLayout>
                <InvoicesDalese />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/hyrese"
          element={
            <ProtectedRoute>
              <AppLayout>
                <InvoicesHyrese />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/processing"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Processing />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        {/* Redirect old /invoices route to dalese */}
        <Route
          path="/invoices"
          element={<Navigate to="/invoices/dalese" replace />}
        />
        {/* Redirect old /processing route to new location */}
        <Route
          path="/processing"
          element={<Navigate to="/invoices/processing" replace />}
        />
        <Route
          path="/purchase"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Purchase />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Clients />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Stock />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute requireAdmin>
              <AppLayout>
                <Reports />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute requireAdmin>
              <AppLayout>
                <Settings />
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CompanySettingsProvider>
          <AlertProvider>
            <SidebarProvider>
              <FiscalPrinterProvider>
                <AppContent />
              </FiscalPrinterProvider>
            </SidebarProvider>
          </AlertProvider>
        </CompanySettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
