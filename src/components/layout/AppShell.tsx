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
  Settings, LogOut, Truck, Warehouse, MapPinned, ShieldCheck, UserCircle2, Inbox,
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

/**
 * Render a sidebar nav item, optionally gated by a permission. When the
 * user lacks the permission, the link is rendered as a disabled-looking
 * row with a tooltip — matching the "show but disabled" UX choice.
 */
function GatedNavLink({
  to, end, icon: Icon, label, permission,
}: {
  to: string;
  end?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  permission?: Permission;
}) {
  const { isAllowed, role } = useUserRole();
  const allowed = !permission || isAllowed(permission);

  if (allowed) {
    return (
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          }`
        }
      >
        <Icon className="h-4 w-4" />
        {label}
      </NavLink>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-disabled
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/40 cursor-not-allowed"
        >
          <Icon className="h-4 w-4" />
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right">{deniedReason(permission!, role)}</TooltipContent>
    </Tooltip>
  );
}

/** Map a nav item's module key to a permission for gating. */
const MODULE_PERMISSION: Record<string, Permission> = {
  Assets: "view:assets",
  Inventory: "view:assets",
  Routes: "view:assets",
  Reservations: "view:reservations",
  Movements: "view:reservations",
  Deliveries: "view:reservations",
  Customers: "view:customers",
  Invoices: "view:invoices",
  Orders: "view:invoices",
  Reports: "view:reports",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, company, signOut } = useAuth();
  const location = useLocation();
  const enabledModules = getEnabledModules(company?.settings, company?.industry_type);
  const items = navItems(company?.industry_type, enabledModules);
  const { isAdmin, isCustomer } = useUserRole();

  const initials = (profile?.full_name || user?.email || "?")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  // Customers see a slimmed-down sidebar: only Dashboard + their own
  // reservations & invoices. Everything else is hidden (not just disabled),
  // since those modules don't apply to them at all.
  const visibleItems = isCustomer
    ? items.filter((i) =>
        i.to === "/app" ||
        i.to === "/app/reservations" ||
        i.to === "/app/invoices",
      )
    : items;

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
          <Link to="/app"><ApexLogo size="sm" /></Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {visibleItems.map((item) => (
            <GatedNavLink
              key={item.to}
              to={item.to}
              end={item.end}
              icon={item.icon}
              label={item.label}
              permission={item.module ? MODULE_PERMISSION[item.module] : undefined}
            />
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          {/* Customer-only: link to their portal page (profile + update requests). */}
          {isCustomer && (
            <GatedNavLink
              to="/app/portal"
              icon={UserCircle2}
              label="My profile"
              permission="view:portal"
            />
          )}
          {/* Admin-only — shown disabled to Team Members so they can see
              what their role would unlock. Hidden entirely from customers. */}
          {!isCustomer && (
            <>
              <GatedNavLink
                to="/app/admin/update-requests"
                icon={Inbox}
                label="Update requests"
                permission="manage:customers"
              />
              <GatedNavLink
                to="/app/admin/csv-analytics"
                icon={ShieldCheck}
                label="CSV analytics"
                permission="view:csv-analytics"
              />
            </>
          )}
          {/* Settings: admins manage company; team members see disabled; hidden from customers. */}
          {!isCustomer && (
            isAdmin ? (
              <GatedNavLink to="/app/settings" icon={Settings} label="Settings" />
            ) : (
              <GatedNavLink
                to="/app/settings"
                icon={Settings}
                label="Settings"
                permission="view:settings"
              />
            )
          )}
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
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/app/settings"><Settings className="h-4 w-4 mr-2" />Settings</Link>
                  </DropdownMenuItem>
                )}
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
