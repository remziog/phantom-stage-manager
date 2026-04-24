import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { getEnabledModules, getEnabledPaths } from "@/lib/modules";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import CreateCompanyPage from "./pages/onboarding/CreateCompanyPage";
import OnboardingWizard from "./pages/onboarding/OnboardingWizard";
import DashboardPage from "./pages/app/DashboardPage";
import AssetsPage from "./pages/app/rental/AssetsPage";
import AssetsImportPage from "./pages/app/rental/AssetsImportPage";
import ReservationsPage from "./pages/app/rental/ReservationsPage";
import CustomersPage from "./pages/app/rental/CustomersPage";
import InvoicesPage from "./pages/app/rental/InvoicesPage";
import ReportsPage from "./pages/app/rental/ReportsPage";
import SettingsPage from "./pages/app/SettingsPage";
import CsvAnalyticsPage from "./pages/app/admin/CsvAnalyticsPage";
import CsvFieldDetailPage from "./pages/app/admin/CsvFieldDetailPage";
import CustomerPortalPage from "./pages/app/portal/CustomerPortalPage";
import NotFound from "./pages/NotFound";
import { RoleGate } from "@/components/RoleGate";

const queryClient = new QueryClient();

function ApplyTheme({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem("apex-theme");
    const dark = stored ? stored === "dark" : true;
    document.documentElement.classList.toggle("dark", dark);
  }, []);
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function ProtectedRoute({
  children,
  requiresCompany = true,
  path,
}: {
  children: React.ReactNode;
  requiresCompany?: boolean;
  /** When set, the route is only accessible if its path is in the company's enabled modules. */
  path?: string;
}) {
  const { user, loading, company } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (requiresCompany && !company) return <Navigate to="/create-company" replace />;
  if (requiresCompany && company && !company.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }
  // Module gating — only check after onboarding is complete and a path is provided.
  if (path && company?.onboarding_completed) {
    const enabled = getEnabledPaths(getEnabledModules(company.settings, company.industry_type));
    if (!enabled.has(path)) return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Onboarding (logged-in but no company / wizard incomplete) */}
      <Route path="/create-company" element={<ProtectedRoute requiresCompany={false}><CreateCompanyPage /></ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute requiresCompany={false}><OnboardingWizard /></ProtectedRoute>} />

      {/* App */}
      <Route path="/app" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/app/assets" element={<ProtectedRoute path="/app/assets"><AssetsPage /></ProtectedRoute>} />
      <Route path="/app/assets/import" element={<ProtectedRoute path="/app/assets"><AssetsImportPage /></ProtectedRoute>} />
      <Route path="/app/reservations" element={<ProtectedRoute path="/app/reservations"><ReservationsPage /></ProtectedRoute>} />
      <Route path="/app/customers" element={<ProtectedRoute path="/app/customers"><CustomersPage /></ProtectedRoute>} />
      <Route path="/app/invoices" element={<ProtectedRoute path="/app/invoices"><InvoicesPage /></ProtectedRoute>} />
      <Route path="/app/reports" element={<ProtectedRoute path="/app/reports"><ReportsPage /></ProtectedRoute>} />
      <Route path="/app/settings" element={<ProtectedRoute><RoleGate permission="view:settings"><SettingsPage /></RoleGate></ProtectedRoute>} />
      <Route path="/app/admin/csv-analytics" element={<ProtectedRoute><RoleGate permission="view:csv-analytics"><CsvAnalyticsPage /></RoleGate></ProtectedRoute>} />
      <Route path="/app/admin/csv-analytics/field/:field" element={<ProtectedRoute><RoleGate permission="view:csv-analytics"><CsvFieldDetailPage /></RoleGate></ProtectedRoute>} />
      <Route path="/app/portal" element={<ProtectedRoute><RoleGate permission="view:portal"><CustomerPortalPage /></RoleGate></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ApplyTheme>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ApplyTheme>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
