import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  Building2,
  FileText,
  Calendar,
  Settings,
  Bell,
  PenLine,
  ClipboardList,
  ScanLine,
  Receipt,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

type NavItem = { title: string; url: string; icon: React.ElementType };

const allNavItems: (NavItem & { roles: AppRole[] })[] = [
  { title: "Panel", url: "/", icon: LayoutDashboard, roles: ["admin", "sales", "team_member", "crew", "customer"] },
  { title: "Ekipman", url: "/equipment", icon: Package, roles: ["admin", "sales", "team_member", "crew"] },
  { title: "Ekip", url: "/team", icon: Users, roles: ["admin"] },
  { title: "Lojistik", url: "/logistics", icon: Truck, roles: ["admin", "sales"] },
  { title: "Müşteriler", url: "/customers", icon: Building2, roles: ["admin", "sales"] },
  { title: "Teklifler", url: "/quotes", icon: FileText, roles: ["admin", "sales", "customer"] },
  { title: "Etkinlikler", url: "/events", icon: Calendar, roles: ["admin", "sales", "team_member", "crew"] },
  { title: "QR Tarayıcı", url: "/scanner", icon: ScanLine, roles: ["admin", "sales", "team_member", "crew"] },
  { title: "Masraflar", url: "/expenses", icon: Receipt, roles: ["admin", "sales", "team_member", "crew"] },
  { title: "Teklif Talepleri", url: "/request-quote", icon: ClipboardList, roles: ["admin", "sales"] },
  { title: "Teklif İste", url: "/request-quote", icon: PenLine, roles: ["customer"] },
  { title: "Bildirimler", url: "/notifications", icon: Bell, roles: ["admin", "sales", "team_member", "crew", "customer"] },
  { title: "Ayarlar", url: "/settings", icon: Settings, roles: ["admin"] },
];

const roleLabels: Record<AppRole, string> = {
  admin: "Yönetici",
  sales: "Teklif Hazırlayıcı",
  team_member: "Ekip Üyesi",
  crew: "Personel",
  customer: "Müşteri",
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role, signOut, profile } = useAuth();
  const location = useLocation();

  const navItems = allNavItems.filter((item) => role && item.roles.includes(role));

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar">
        {/* Logo */}
        <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
          {!collapsed ? (
            <span className="text-lg font-black tracking-tighter text-foreground">
              PHANTOM
            </span>
          ) : (
            <span className="text-lg font-black text-foreground">P</span>
          )}
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200"
                      activeClassName="bg-sidebar-accent text-primary border-l-2 border-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User info & Sign out at bottom */}
        <div className="mt-auto border-t border-sidebar-border p-4 space-y-3">
          {!collapsed && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground truncate">
                {profile?.full_name || "Kullanıcı"}
              </p>
              <p className="text-xs text-muted-foreground">
                {role ? roleLabels[role] : "..."}
              </p>
            </div>
          )}
          <button
            onClick={signOut}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors w-full text-left"
          >
            {collapsed ? "×" : "Çıkış Yap"}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
