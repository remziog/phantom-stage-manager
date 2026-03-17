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

const adminNavItems = [
  { title: "Panel", url: "/", icon: LayoutDashboard },
  { title: "Ekipman", url: "/equipment", icon: Package },
  { title: "Ekip", url: "/team", icon: Users },
  { title: "Lojistik", url: "/logistics", icon: Truck },
  { title: "Müşteriler", url: "/customers", icon: Building2 },
  { title: "Teklifler", url: "/quotes", icon: FileText },
  { title: "Etkinlikler", url: "/events", icon: Calendar },
  { title: "Bildirimler", url: "/notifications", icon: Bell },
  { title: "Ayarlar", url: "/settings", icon: Settings },
];

const customerNavItems = [
  { title: "Panel", url: "/", icon: LayoutDashboard },
  { title: "Teklif İste", url: "/request-quote", icon: PenLine },
  { title: "Tekliflerim", url: "/quotes", icon: FileText },
  { title: "Etkinliklerim", url: "/events", icon: Calendar },
  { title: "Bildirimler", url: "/notifications", icon: Bell },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role, signOut, profile } = useAuth();
  const location = useLocation();

  const navItems = role === "customer" ? customerNavItems : adminNavItems;

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
              <p className="text-xs text-muted-foreground capitalize">
                {role === "admin" ? "Yönetici" : role === "team_member" ? "Ekip Üyesi" : role === "customer" ? "Müşteri" : "..."}
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