import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ApexLogo } from "@/components/ApexLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, Boxes, CalendarRange, Users, FileText, BarChart3,
  Settings, LogOut, Truck, Warehouse, MapPinned, ShieldCheck,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { getEnabledModules } from "@/lib/modules";
import { useUserRole, deniedReason, type Permission } from "@/hooks/useUserRole";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Industry = Database["public"]["Enums"]["industry_type"];

type NavItem = {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  end?: boolean;
  /** Module key (matches values stored in `company.settings.enabled_modules`). */
  module?: string;
};

/** All possible nav items per industry, each tagged with the module that gates it. */
function allNavItems(industry: Industry | null | undefined): NavItem[] {
  const dash: NavItem = { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true };
  const customers: NavItem = { to: "/app/customers", icon: Users, label: "Customers", module: "Customers" };
  const reports: NavItem = { to: "/app/reports", icon: BarChart3, label: "Reports", module: "Reports" };

  if (industry === "warehouse") {
    return [
      dash,
      { to: "/app/assets", icon: Warehouse, label: "Inventory", module: "Inventory" },
      { to: "/app/reservations", icon: Boxes, label: "Movements", module: "Movements" },
      customers,
      { to: "/app/invoices", icon: FileText, label: "Orders", module: "Orders" },
      reports,
    ];
  }
  if (industry === "logistics") {
    return [
      dash,
      { to: "/app/reservations", icon: Truck, label: "Deliveries", module: "Deliveries" },
      { to: "/app/assets", icon: MapPinned, label: "Routes", module: "Routes" },
      customers,
      { to: "/app/invoices", icon: FileText, label: "Invoices", module: "Invoices" },
      reports,
    ];
  }
  // default rental + mixed
  return [
    dash,
    { to: "/app/assets", icon: Boxes, label: "Assets", module: "Assets" },
    { to: "/app/reservations", icon: CalendarRange, label: "Reservations", module: "Reservations" },
    customers,
    { to: "/app/invoices", icon: FileText, label: "Invoices", module: "Invoices" },
    reports,
  ];
}

/** Filter nav items by the modules the user enabled during onboarding. */
function navItems(industry: Industry | null | undefined, enabled: string[]): NavItem[] {
  const enabledSet = new Set(enabled);
  return allNavItems(industry).filter((item) => !item.module || enabledSet.has(item.module));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, company, signOut } = useAuth();
  const location = useLocation();
  const enabledModules = getEnabledModules(company?.settings, company?.industry_type);
  const items = navItems(company?.industry_type, enabledModules);

  // Resolve the caller's role inside the current company so we can show
  // admin-only nav links (e.g. CSV analytics). RLS still enforces access
  // on the page itself — this is purely UX.
  const { data: role } = useQuery({
    queryKey: ["company-role", company?.id ?? "", user?.id ?? ""],
    queryFn: () => fetchCurrentMemberRole(company!.id, user!.id),
    enabled: !!company?.id && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
  const isAdmin = role === "owner" || role === "admin";

  const initials = (profile?.full_name || user?.email || "?")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
          <Link to="/app"><ApexLogo size="sm" /></Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          {isAdmin && (
            <NavLink
              to="/app/admin/csv-analytics"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`
              }
            >
              <ShieldCheck className="h-4 w-4" />
              CSV analytics
            </NavLink>
          )}
          <NavLink
            to="/app/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`
            }
          >
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {company?.name ?? "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm">{profile?.full_name || "User"}</span>
                    <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/app/settings"><Settings className="h-4 w-4 mr-2" />Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main key={location.pathname} className="flex-1 overflow-auto animate-fade-in-up">
          <div className="max-w-[1400px] mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
