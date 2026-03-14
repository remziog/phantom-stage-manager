import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react";

const routeLabels: Record<string, string> = {
  "": "Dashboard",
  equipment: "Equipment",
  team: "Team",
  logistics: "Logistics",
  customers: "Customers",
  quotes: "Quotes",
  events: "Events",
  settings: "Settings",
  notifications: "Notifications",
  "request-quote": "Request Quote",
};

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    const isLast = i === segments.length - 1;
    const label = routeLabels[seg] || (seg.length > 8 ? "Details" : seg.charAt(0).toUpperCase() + seg.slice(1));
    return { path, label, isLast };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb) => (
          <Fragment key={crumb.path}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage className="text-foreground">{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.path} className="text-muted-foreground hover:text-foreground">
                    {crumb.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
