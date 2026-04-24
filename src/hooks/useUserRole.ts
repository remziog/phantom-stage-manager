/**
 * Resolves the caller's role in the current company and exposes a single
 * UI role (`admin` | `team_member` | `customer`) plus an `isAllowed()`
 * permission helper. RLS still enforces access on the server — this hook
 * is purely for UX (hiding/disabling controls).
 *
 * UI ↔ DB role mapping:
 *   admin       ← owner | admin
 *   team_member ← manager | operator
 *   customer    ← viewer  OR  user has profile.linked_customer_id set
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCurrentMemberRole } from "@/services/csvAnalyticsAdmin";

export type UiRole = "admin" | "team_member" | "customer";

/** Actions that can be gated. Add new ones here as features grow. */
export type Permission =
  // navigation / pages
  | "view:settings"
  | "view:csv-analytics"
  | "view:reports"
  | "view:assets"
  | "view:reservations"
  | "view:customers"
  | "view:invoices"
  // mutations on tenant data
  | "manage:assets"
  | "manage:reservations"
  | "manage:customers"
  | "manage:invoices"
  // company-level
  | "manage:company"
  | "manage:members";

const PERMISSIONS: Record<UiRole, Permission[]> = {
  admin: [
    "view:settings", "view:csv-analytics", "view:reports",
    "view:assets", "view:reservations", "view:customers", "view:invoices",
    "manage:assets", "manage:reservations", "manage:customers", "manage:invoices",
    "manage:company", "manage:members",
  ],
  team_member: [
    "view:reports",
    "view:assets", "view:reservations", "view:customers", "view:invoices",
    "manage:assets", "manage:reservations", "manage:customers", "manage:invoices",
  ],
  // Customers only see their own reservations & invoices (RLS enforces it).
  customer: ["view:reservations", "view:invoices"],
};

export function useUserRole() {
  const { user, profile, company, loading: authLoading } = useAuth();

  const { data: dbRole, isLoading: roleLoading } = useQuery({
    queryKey: ["company-role", company?.id ?? "", user?.id ?? ""],
    queryFn: () => fetchCurrentMemberRole(company!.id, user!.id),
    enabled: !!company?.id && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // A user with a linked_customer_id is always treated as a customer,
  // regardless of any membership row.
  const isLinkedCustomer = !!profile?.linked_customer_id;

  let role: UiRole | null = null;
  if (isLinkedCustomer) role = "customer";
  else if (dbRole === "owner" || dbRole === "admin") role = "admin";
  else if (dbRole === "manager" || dbRole === "operator") role = "team_member";
  else if (dbRole === "viewer") role = "customer";

  const isAllowed = (perm: Permission): boolean => {
    if (!role) return false;
    return PERMISSIONS[role].includes(perm);
  };

  return {
    role,
    isAdmin: role === "admin",
    isTeamMember: role === "team_member",
    isCustomer: role === "customer",
    isAllowed,
    loading: authLoading || (!!company?.id && !!user?.id && roleLoading),
  };
}

/** Friendly label for the role (used in tooltips). */
export function roleLabel(role: UiRole | null): string {
  switch (role) {
    case "admin": return "Admin";
    case "team_member": return "Team Member";
    case "customer": return "Customer";
    default: return "Guest";
  }
}

/** Tooltip text when an action is blocked because of role. */
export function deniedReason(perm: Permission, role: UiRole | null): string {
  const needsAdmin: Permission[] = [
    "view:settings", "view:csv-analytics",
    "manage:company", "manage:members",
  ];
  if (needsAdmin.includes(perm)) return "Requires admin";
  if (role === "customer") return "Read-only access";
  return "Not allowed for your role";
}
