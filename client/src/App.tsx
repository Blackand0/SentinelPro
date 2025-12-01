import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { ProtectedRoute } from "@/components/protected-route";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import PrintJobsPage from "@/pages/print-jobs";
import NewPrintJobPage from "@/pages/new-print-job";
import UsersPage from "@/pages/users";
import PrintersPage from "@/pages/printers";
import ConsumptionPage from "@/pages/consumption";
import CompaniesPage from "@/pages/companies";
import PaperTypesPage from "@/pages/paper-types";
import MaintenancePage from "@/pages/maintenance";
import AnalyticsPage from "@/pages/analytics";
import TonerInventoryPage from "@/pages/toner-inventory";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

function AuthenticatedLayout() {
  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 flex items-start justify-center">
          <div className="w-full max-w-5xl">
            <Switch>
              <Route path="/" component={DashboardPage} />
              <Route path="/print-jobs" component={PrintJobsPage} />
              <Route path="/print-jobs/new">
                <ProtectedRoute allowedRoles={["admin", "operator"]}>
                  <NewPrintJobPage />
                </ProtectedRoute>
              </Route>
              <Route path="/companies">
                <ProtectedRoute allowedRoles={["super-admin"]}>
                  <CompaniesPage />
                </ProtectedRoute>
              </Route>
              <Route path="/users">
                <ProtectedRoute allowedRoles={["admin", "super-admin"]}>
                  <UsersPage />
                </ProtectedRoute>
              </Route>
              <Route path="/printers">
                <ProtectedRoute allowedRoles={["admin", "operator"]}>
                  <PrintersPage />
                </ProtectedRoute>
              </Route>
              <Route path="/consumption">
                <ProtectedRoute allowedRoles={["admin", "operator"]}>
                  <ConsumptionPage />
                </ProtectedRoute>
              </Route>
              <Route path="/paper-types">
                <ProtectedRoute allowedRoles={["admin", "operator"]}>
                  <PaperTypesPage />
                </ProtectedRoute>
              </Route>
              <Route path="/maintenance">
                <ProtectedRoute allowedRoles={["admin", "operator"]}>
                  <MaintenancePage />
                </ProtectedRoute>
              </Route>
              <Route path="/analytics">
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AnalyticsPage />
                </ProtectedRoute>
              </Route>
              <Route path="/toner-inventory">
                <ProtectedRoute allowedRoles={["admin"]}>
                  <TonerInventoryPage />
                </ProtectedRoute>
              </Route>
              <Route component={NotFound} />
            </Switch>
          </div>
        </main>
      </div>
    </div>
  );
}

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated && location !== "/login" && location !== "/register") {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route component={LoginPage} />
      </Switch>
    );
  }

  return (
    <ProtectedRoute>
      <AuthenticatedLayout />
    </ProtectedRoute>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <SidebarProvider style={style as React.CSSProperties}>
              <Toaster />
              <AppRouter />
            </SidebarProvider>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
