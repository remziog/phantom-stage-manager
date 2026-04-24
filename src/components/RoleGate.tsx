/**
 * Route-level role gate. Renders children only when the user has the
 * required permission; otherwise redirects to /app. Pair with the
 * sidebar's disabled-state UX so users get a tooltip explaining why
 * the link is unavailable.
 */
import { Navigate } from "react-router-dom";
import { useUserRole, type Permission } from "@/hooks/useUserRole";

interface Props {
  permission: Permission;
  children: React.ReactNode;
  /** Where to send unauthorized users. Defaults to dashboard. */
  redirectTo?: string;
}

export function RoleGate({ permission, children, redirectTo = "/app" }: Props) {
  const { isAllowed, loading } = useUserRole();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (!isAllowed(permission)) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}
