import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { listAssets } from "@/services/assets";
import { listReservations } from "@/services/reservations";
import { listInvoices } from "@/services/invoices";
import { Boxes, CalendarRange, AlertTriangle, DollarSign, Plus, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { company } = useAuth();
  const cid = company?.id ?? "";

  const { data: assets = [] }       = useQuery({ queryKey: ["assets", cid],       queryFn: () => listAssets(cid),       enabled: !!cid });
  const { data: reservations = [] } = useQuery({ queryKey: ["reservations", cid], queryFn: () => listReservations(cid), enabled: !!cid });
  const { data: invoices = [] }     = useQuery({ queryKey: ["invoices", cid],     queryFn: () => listInvoices(cid),     enabled: !!cid });

  const activeRentals = reservations.filter((r) => r.status === "active").length;
  const utilization = assets.length === 0 ? 0
    : Math.round((assets.filter((a) => a.status === "rented").length / assets.length) * 100);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = reservations.filter((r) => r.status === "active" && r.end_date && r.end_date < today).length;
  const monthStart = new Date(); monthStart.setDate(1);
  const revenue = invoices
    .filter((i) => i.status === "paid" && new Date(i.issue_date) >= monthStart)
    .reduce((sum, i) => sum + Number(i.total), 0);

  const fmt = (n: number) => `${company?.currency ?? "USD"} ${n.toFixed(2)}`;

  const kpis = [
    { label: "Active rentals",      value: String(activeRentals), icon: CalendarRange },
    { label: "Utilization",         value: `${utilization}%`,     icon: Boxes },
    { label: "Overdue returns",     value: String(overdue),       icon: AlertTriangle, danger: overdue > 0 },
    { label: "Revenue this month",  value: fmt(revenue),          icon: DollarSign },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-display">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Here's what's happening at {company?.name}.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/app/assets"><Plus className="h-4 w-4 mr-2" />New asset</Link></Button>
            <Button asChild><Link to="/app/reservations"><Plus className="h-4 w-4 mr-2" />New reservation</Link></Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</span>
                  <k.icon className={`h-4 w-4 ${k.danger ? "text-destructive" : "text-primary"}`} />
                </div>
                <div className={`mt-2 text-2xl font-bold tabular-nums ${k.danger ? "text-destructive" : ""}`}>{k.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent reservations</CardTitle>
              <Button asChild variant="ghost" size="sm"><Link to="/app/reservations">View all <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
            </CardHeader>
            <CardContent>
              {reservations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reservations yet. Create your first one.</p>
              ) : (
                <ul className="space-y-3">
                  {reservations.slice(0, 5).map((r) => (
                    <li key={r.id} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{r.customer?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.start_date} → {r.end_date}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs bg-muted capitalize">{r.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent invoices</CardTitle>
              <Button asChild variant="ghost" size="sm"><Link to="/app/invoices">View all <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices yet.</p>
              ) : (
                <ul className="space-y-3">
                  {invoices.slice(0, 5).map((i) => (
                    <li key={i.id} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{i.invoice_number}</div>
                        <div className="text-xs text-muted-foreground">{i.customer?.name ?? "—"} • {i.issue_date}</div>
                      </div>
                      <span className="tabular-nums font-medium">{fmt(Number(i.total))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
