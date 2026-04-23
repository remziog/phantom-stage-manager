import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import CreateCompanyPage from "./pages/onboarding/CreateCompanyPage";
import OnboardingWizard from "./pages/onboarding/OnboardingWizard";
import DashboardPage from "./pages/app/DashboardPage";
import AssetsPage from "./pages/app/rental/AssetsPage";
import ReservationsPage from "./pages/app/rental/ReservationsPage";
import CustomersPage from "./pages/app/rental/CustomersPage";
import InvoicesPage from "./pages/app/rental/InvoicesPage";
import ReportsPage from "./pages/app/rental/ReportsPage";
import SettingsPage from "./pages/app/SettingsPage";
import NotFound from "./pages/NotFound";

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

function ProtectedRoute({ children, requiresCompany = true }: { children: React.ReactNode; requiresCompany?: boolean }) {
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
      <Route path="/app/assets" element={<ProtectedRoute><AssetsPage /></ProtectedRoute>} />
      <Route path="/app/reservations" element={<ProtectedRoute><ReservationsPage /></ProtectedRoute>} />
      <Route path="/app/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
      <Route path="/app/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
      <Route path="/app/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/app/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

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
