import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useEquipment } from "@/hooks/useEquipment";
import { useEvents } from "@/hooks/useEvents";
import { useQuotes } from "@/hooks/useQuotes";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useVehicles } from "@/hooks/useVehicles";
import { useCustomers } from "@/hooks/useCustomers";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { QuoteStatusBadge } from "@/components/quotes/QuoteStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Package, Calendar, FileText, TrendingUp, Users, Truck,
  Building2, Zap, CheckCircle2, Clock, MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const fmt = (v: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });

function KpiCard({
  title, value, subtitle, icon: Icon, color,
}: {
  title: string; value: string | number; subtitle?: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card className="phantom-shadow border-border/50">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg bg-secondary p-2.5 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const { data: equipment = [] } = useEquipment();
  const { data: events = [] } = useEvents();
  const { data: quotes = [] } = useQuotes();
  const { data: team = [] } = useTeamMembers();
  const { data: vehicles = [] } = useVehicles();
  const { data: customers = [] } = useCustomers();

  // KPI calculations
  const equipmentValue = equipment.reduce((s, e) => s + e.gross_price_per_day * e.quantity_total, 0);
  const totalItems = equipment.reduce((s, e) => s + e.quantity_total, 0);
  const availableItems = equipment.reduce((s, e) => s + e.quantity_available, 0);

  const today = new Date().toISOString().split("T")[0];
  const activeEvents = events.filter((e) => e.status === "In Progress" || e.status === "Confirmed");
  const upcomingEvents = events.filter((e) => e.start_date >= today && e.status !== "Cancelled" && e.status !== "Completed").slice(0, 5);

  const pipelineQuotes = quotes.filter((q) => q.status === "Draft" || q.status === "Sent");
  const pipelineValue = pipelineQuotes.reduce((s, q) => s + q.total, 0);
  const approvedValue = quotes.filter((q) => q.status === "Approved").reduce((s, q) => s + q.total, 0);
  const recentQuotes = quotes.slice(0, 5);

  const availableTeam = team.filter((t) => t.is_available).length;
  const teamUtilization = team.length > 0 ? Math.round(((team.length - availableTeam) / team.length) * 100) : 0;

  const availableVehicles = vehicles.filter((v) => v.is_available).length;
  const activeCustomers = customers.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Precision engineering for every stage.</p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard title="Equipment Value" value={fmt(equipmentValue)} subtitle={`${totalItems} items · ${availableItems} available`} icon={Package} color="text-primary" />
        <KpiCard title="Active Events" value={activeEvents.length} subtitle={`${events.length} total`} icon={Calendar} color="text-[hsl(var(--warning))]" />
        <KpiCard title="Pipeline Value" value={fmt(pipelineValue)} subtitle={`${pipelineQuotes.length} open quotes`} icon={FileText} color="text-accent" />
        <KpiCard title="Approved Revenue" value={fmt(approvedValue)} subtitle={`${quotes.filter((q) => q.status === "Approved").length} approved`} icon={TrendingUp} color="text-[hsl(var(--success))]" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard title="Team Members" value={team.length} subtitle={`${availableTeam} available`} icon={Users} color="text-[hsl(var(--success))]" />
        <KpiCard title="Fleet" value={vehicles.length} subtitle={`${availableVehicles} available`} icon={Truck} color="text-[hsl(var(--warning))]" />
        <KpiCard title="Active Customers" value={activeCustomers} subtitle={`${customers.length} total`} icon={Building2} color="text-primary" />
        <Card className="phantom-shadow border-border/50">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Team Utilization</p>
              <span className="text-sm font-semibold text-foreground tabular-nums">{teamUtilization}%</span>
            </div>
            <Progress value={teamUtilization} className="h-2" />
            <p className="text-xs text-muted-foreground">{team.length - availableTeam} assigned · {availableTeam} free</p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Upcoming Events */}
        <Card className="phantom-shadow border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-primary" /> Upcoming Events
              </CardTitle>
              <button onClick={() => navigate("/events")} className="text-xs text-primary hover:underline">View all</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No upcoming events.</p>
            ) : (
              upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2 cursor-pointer hover:bg-secondary transition-colors"
                  onClick={() => navigate(`/events/${ev.id}`)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ev.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.venue || "TBD"}</span>
                      <span>{fmtDate(ev.start_date)}{ev.start_date !== ev.end_date && ` — ${fmtDate(ev.end_date)}`}</span>
                    </div>
                  </div>
                  <EventStatusBadge status={ev.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Quotes */}
        <Card className="phantom-shadow border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-accent" /> Recent Quotes
              </CardTitle>
              <button onClick={() => navigate("/quotes")} className="text-xs text-primary hover:underline">View all</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No quotes yet.</p>
            ) : (
              recentQuotes.map((qt) => (
                <div
                  key={qt.id}
                  className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2 cursor-pointer hover:bg-secondary transition-colors"
                  onClick={() => navigate(`/quotes/${qt.id}`)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      <span className="font-mono text-primary">{qt.quote_number}</span>{" "}
                      {qt.customer_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{qt.event_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground tabular-nums">{fmt(qt.total)}</span>
                    <QuoteStatusBadge status={qt.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CustomerDashboard() {
  const navigate = useNavigate();
  const { data: quotes = [] } = useQuotes();
  const { data: events = [] } = useEvents();
  const { profile } = useAuth();

  const today = new Date().toISOString().split("T")[0];
  const activeEvents = events.filter((e) => e.status !== "Completed" && e.status !== "Cancelled");
  const pendingQuotes = quotes.filter((q) => q.status === "Sent" || q.status === "Draft");
  const approvedTotal = quotes.filter((q) => q.status === "Approved").reduce((s, q) => s + q.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">View your quotes and event status.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard title="My Quotes" value={quotes.length} icon={FileText} color="text-primary" />
        <KpiCard title="Active Events" value={activeEvents.length} icon={Calendar} color="text-accent" />
        <KpiCard title="Pending Quotes" value={pendingQuotes.length} icon={Clock} color="text-[hsl(var(--warning))]" />
        <KpiCard title="Approved Value" value={fmt(approvedTotal)} icon={TrendingUp} color="text-[hsl(var(--success))]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Quotes */}
        <Card className="phantom-shadow border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> My Quotes
              </CardTitle>
              <button onClick={() => navigate("/quotes")} className="text-xs text-primary hover:underline">View all</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No quotes yet.</p>
            ) : (
              quotes.slice(0, 5).map((qt) => (
                <div
                  key={qt.id}
                  className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2 cursor-pointer hover:bg-secondary transition-colors"
                  onClick={() => navigate(`/quotes/${qt.id}`)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      <span className="font-mono text-primary">{qt.quote_number}</span>{" "}
                      {qt.event_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {qt.event_date ? fmtDate(qt.event_date) : "No date"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground tabular-nums">{fmt(qt.total)}</span>
                    <QuoteStatusBadge status={qt.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* My Events */}
        <Card className="phantom-shadow border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" /> My Events
              </CardTitle>
              <button onClick={() => navigate("/events")} className="text-xs text-primary hover:underline">View all</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No events yet.</p>
            ) : (
              events.slice(0, 5).map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2 cursor-pointer hover:bg-secondary transition-colors"
                  onClick={() => navigate(`/events/${ev.id}`)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ev.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {ev.venue || "TBD"} · {fmtDate(ev.start_date)}
                    </p>
                  </div>
                  <EventStatusBadge status={ev.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      {role === "customer" ? <CustomerDashboard /> : <AdminDashboard />}
    </DashboardLayout>
  );
}
