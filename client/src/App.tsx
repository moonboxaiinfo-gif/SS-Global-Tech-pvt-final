import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BusinessFieldProvider } from "@/contexts/BusinessFieldContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Manage from "./pages/Manage";
import Salary from "./pages/Salary";
import FinalStatement from "./pages/FinalStatement";
import Sales from "./pages/Sales";
import Warranties from "./pages/Warranties";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Finance from "./pages/Finance";
import Reports from "./pages/Reports";
import Inventory from "./pages/Inventory";
import Quotations from "./pages/Quotations";
import CRM from "./pages/CRM";
import Roles from "./pages/Roles";
import AuditLogs from "./pages/AuditLogs";
import NotFound from "./pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { getAuthSession, getSupabaseAuthSession } from "@/lib/auth";
import { canAccess, permissionForPath } from "@/lib/rbac";

function ProtectedWorkspace() {
  const [location, navigate] = useLocation();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => {
    const check = async () => {
      const cached = getAuthSession();
      const guestPreview =
        import.meta.env.DEV && cached?.userId === "guest-preview";
      const session = guestPreview ? cached : await getSupabaseAuthSession();
      setAuthenticated(Boolean(session));
      setChecking(false);
      if (!session) navigate("/login");
    };
    void check();
    const onSession = () => void check();
    window.addEventListener("ss-global-auth-session", onSession);
    return () =>
      window.removeEventListener("ss-global-auth-session", onSession);
  }, [navigate]);

  if (checking)
    return (
      <div className="grid min-h-screen place-items-center bg-[#F1F5F7] text-sm font-bold text-[#476174]">
        Checking secure session…
      </div>
    );
  if (!authenticated) return null;
  if (!canAccess(permissionForPath(location), "view")) return <NotFound />;
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/app/dashboard" component={Home} />
        <Route path="/employees" component={Manage} />
        <Route path="/payroll/settlement" component={FinalStatement} />
        <Route path="/payroll" component={Salary} />
        <Route path="/sales" component={Sales} />
        <Route path="/warranties" component={Warranties} />
        <Route path="/projects/:id" component={ProjectDetail} />
        <Route path="/projects" component={Projects} />
        <Route path="/finance" component={Finance} />
        <Route path="/reports" component={Reports} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/quotations" component={Quotations} />
        <Route path="/crm" component={CRM} />
        <Route path="/settings/roles" component={Roles} />
        <Route path="/settings/audit-logs" component={AuditLogs} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BusinessFieldProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Toaster position="top-right" />
              <Switch>
                <Route path="/login" component={Login} />
                <Route path="/app/login" component={Login} />
                <Route component={ProtectedWorkspace} />
              </Switch>
            </TooltipProvider>
          </NotificationProvider>
        </BusinessFieldProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
