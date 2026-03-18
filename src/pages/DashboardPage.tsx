import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RevenueBarChart, EquipmentUtilizationPieChart, ExpenseBarChart, ExpenseCategoryPieChart } from "@/components/dashboard/DashboardCharts";
import { EquipmentAlerts } from "@/components/dashboard/EquipmentAlerts";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { PendingExpensesAlert } from "@/components/dashboard/PendingExpensesAlert";
import { useEquipment } from "@/hooks/useEquipment";
import { useEvents } from "@/hooks/useEvents";
import { useQuotes } from "@/hooks/useQuotes";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useVehicles } from "@/hooks/useVehicles";
import { useCustomers } from "@/hooks/useCustomers";
import { useExpenses } from "@/hooks/useExpenses";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { QuoteStatusBadge } from "@/components/quotes/QuoteStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Package, Calendar, FileText, TrendingUp, Users, Truck,
  Building2, Clock, MapPin, Receipt,
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

/** Helper: get start of current week (Monday) and end of next week (Sunday) */
function getCrewDateRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const nextSunday = new Date(monday);
  nextSunday.setDate(monday.getDate() + 13);
  nextSunday.setHours(23, 59, 59, 999);

  return {
    start: monday.toISOString().split("T")[0],
    end: nextSunday.toISOString().split("T")[0],
  };
}

function AdminDashboard() {
  const navigate = useNavigate();
  const { data: equipment = [] } = useEquipment();
  const { data: events = [] } = useEvents();
  const { data: quotes = [] } = useQuotes();
  const { data: team = [] } = useTeamMembers();
  const { data: vehicles = [] } = useVehicles();
  const { data: customers = [] } = useCustomers();
  const { data: expenses = [] } = useExpenses();

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
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const pendingExpenses = expenses.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0);

  const [expenseRange, setExpenseRange] = useState<string>("6m");
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    let cutoff: Date;
    switch (expenseRange) {
      case "1m": cutoff = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case "3m": cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1); break;
      case "6m": cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1); break;
      case "1y": cutoff = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1); break;
      default: cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    }
    return expenses.filter((e) => new Date(e.expense_date) >= cutoff);
  }, [expenses, expenseRange]);

  const monthCount = expenseRange === "1m" ? 1 : expenseRange === "3m" ? 3 : expenseRange === "1y" ? 12 : 6;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Panel</h1>
        <p className="text-sm text-muted-foreground">Her sahne için hassas mühendislik.</p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard title="Ekipman Değeri" value={fmt(equipmentValue)} subtitle={`${totalItems} ürün · ${availableItems} müsait`} icon={Package} color="text-primary" />
        <KpiCard title="Aktif Etkinlikler" value={activeEvents.length} subtitle={`${events.length} toplam`} icon={Calendar} color="text-[hsl(var(--warning))]" />
        <KpiCard title="Beklenen Gelir" value={fmt(pipelineValue)} subtitle={`${pipelineQuotes.length} açık teklif`} icon={FileText} color="text-accent" />
        <KpiCard title="Onaylanan Gelir" value={fmt(approvedValue)} subtitle={`${quotes.filter((q) => q.status === "Approved").length} onaylı`} icon={TrendingUp} color="text-[hsl(var(--success))]" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard title="Ekip Üyeleri" value={team.length} subtitle={`${availableTeam} müsait`} icon={Users} color="text-[hsl(var(--success))]" />
        <KpiCard title="Araç Filosu" value={vehicles.length} subtitle={`${availableVehicles} müsait`} icon={Truck} color="text-[hsl(var(--warning))]" />
        <KpiCard title="Aktif Müşteriler" value={activeCustomers} subtitle={`${customers.length} toplam`} icon={Building2} color="text-primary" />
        <KpiCard title="Toplam Masraf" value={fmt(totalExpenses)} subtitle={`${expenses.length} kayıt`} icon={Receipt} color="text-destructive" />
        <Card className="phantom-shadow border-border/50">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Ekip Kullanımı</p>
              <span className="text-sm font-semibold text-foreground tabular-nums">{teamUtilization}%</span>
            </div>
            <Progress value={teamUtilization} className="h-2" />
            <p className="text-xs text-muted-foreground">{team.length - availableTeam} atanmış · {availableTeam} boşta</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevenueBarChart quotes={quotes} />
        <EquipmentUtilizationPieChart equipment={equipment} />
      </div>

      {/* Expense Charts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Receipt className="h-4 w-4 text-destructive" /> Masraf Analizi
          </h2>
          <div className="flex gap-1">
            {([["1m", "Bu Ay"], ["3m", "3 Ay"], ["6m", "6 Ay"], ["1y", "Yıllık"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setExpenseRange(key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  expenseRange === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ExpenseBarChart expenses={filteredExpenses} monthCount={monthCount} />
          <ExpenseCategoryPieChart expenses={filteredExpenses} />
        </div>
      </div>

      {/* Category Availability */}
      {(() => {
        const categories = ["Light", "Sound", "Video/Image", "Truss", "Rigging", "Power/Cable", "Other"] as const;
        const catLabels: Record<string, string> = {
          Light: "Işık", Sound: "Ses", "Video/Image": "Video/Görüntü",
          Truss: "Truss", Rigging: "Rigging", "Power/Cable": "Güç/Kablo", Other: "Diğer",
        };
        const catData = categories.map((cat) => {
          const items = equipment.filter((e) => e.category === cat);
          const total = items.reduce((s, e) => s + e.quantity_total, 0);
          const available = items.reduce((s, e) => s + e.quantity_available, 0);
          const pct = total > 0 ? Math.round((available / total) * 100) : 0;
          return { cat, label: catLabels[cat] || cat, total, available, pct };
        }).filter((c) => c.total > 0);

        return catData.length > 0 ? (
          <Card className="phantom-shadow border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-primary" /> Kategoriye Göre Ekipman Durumu
                </CardTitle>
                <button onClick={() => navigate("/equipment")} className="text-xs text-primary hover:underline">Tümünü gör</button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {catData.map((c) => (
                  <div key={c.cat} className="rounded-lg bg-secondary/50 p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {c.available} <span className="text-muted-foreground font-normal">/ {c.total}</span>
                    </p>
                    <Progress value={c.pct} className="h-1.5" />
                    <p className={`text-xs tabular-nums ${c.pct < 20 ? "text-destructive" : c.pct < 50 ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--success))]"}`}>
                      %{c.pct} müsait
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Bottom panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Upcoming Events */}
        <Card className="phantom-shadow border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-primary" /> Yaklaşan Etkinlikler
              </CardTitle>
              <button onClick={() => navigate("/events")} className="text-xs text-primary hover:underline">Tümünü gör</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Yaklaşan etkinlik yok.</p>
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
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.venue || "Belirsiz"}</span>
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
                <FileText className="h-4 w-4 text-accent" /> Son Teklifler
              </CardTitle>
              <button onClick={() => navigate("/quotes")} className="text-xs text-primary hover:underline">Tümünü gör</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Henüz teklif yok.</p>
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

        {/* Equipment Alerts */}
        <EquipmentAlerts equipment={equipment} />
      </div>

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
}

/** Sales dashboard — same as admin but without team/expense management */
function SalesDashboard() {
  return <AdminDashboard />;
}

/** Crew dashboard — only this week + next week assignments, no financial data */
function CrewDashboard() {
  const navigate = useNavigate();
  const { data: events = [] } = useEvents();
  const { data: equipment = [] } = useEquipment();
  const { profile } = useAuth();

  const { start, end } = getCrewDateRange();
  const thisWeekEvents = events.filter(
    (e) => e.start_date <= end && e.end_date >= start && e.status !== "Cancelled" && e.status !== "Completed"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Hoş geldiniz{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">Bu hafta ve gelecek haftaki işleriniz.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <KpiCard title="Aktif İşler" value={thisWeekEvents.length} subtitle="Bu hafta + gelecek hafta" icon={Calendar} color="text-primary" />
        <KpiCard title="Toplam Ekipman" value={equipment.reduce((s, e) => s + e.quantity_total, 0)} subtitle={`${equipment.reduce((s, e) => s + e.quantity_available, 0)} müsait`} icon={Package} color="text-accent" />
      </div>

      <Card className="phantom-shadow border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-primary" /> Bu Hafta & Gelecek Hafta İşlerim
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {thisWeekEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Bu dönemde atanmış iş yok.</p>
          ) : (
            thisWeekEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2 cursor-pointer hover:bg-secondary transition-colors"
                onClick={() => navigate(`/events/${ev.id}`)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{ev.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.venue || "Belirsiz"}</span>
                    <span>{fmtDate(ev.start_date)}{ev.start_date !== ev.end_date && ` — ${fmtDate(ev.end_date)}`}</span>
                  </div>
                </div>
                <EventStatusBadge status={ev.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerDashboard() {
  const navigate = useNavigate();
  const { data: quotes = [] } = useQuotes();
  const { data: events = [] } = useEvents();
  const { profile } = useAuth();

  const activeEvents = events.filter((e) => e.status !== "Completed" && e.status !== "Cancelled");
  const pendingQuotes = quotes.filter((q) => q.status === "Sent" || q.status === "Draft");
  const approvedTotal = quotes.filter((q) => q.status === "Approved").reduce((s, q) => s + q.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Hoş geldiniz{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">Tekliflerinizi ve etkinlik durumunuzu görüntüleyin.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard title="Tekliflerim" value={quotes.length} icon={FileText} color="text-primary" />
        <KpiCard title="Aktif Etkinlikler" value={activeEvents.length} icon={Calendar} color="text-accent" />
        <KpiCard title="Bekleyen Teklifler" value={pendingQuotes.length} icon={Clock} color="text-[hsl(var(--warning))]" />
        <KpiCard title="Onaylanan Değer" value={fmt(approvedTotal)} icon={TrendingUp} color="text-[hsl(var(--success))]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="phantom-shadow border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Tekliflerim
              </CardTitle>
              <button onClick={() => navigate("/quotes")} className="text-xs text-primary hover:underline">Tümünü gör</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Henüz teklif yok.</p>
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
                      {qt.event_date ? fmtDate(qt.event_date) : "Tarih yok"}
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

        <Card className="phantom-shadow border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" /> Etkinliklerim
              </CardTitle>
              <button onClick={() => navigate("/events")} className="text-xs text-primary hover:underline">Tümünü gör</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Henüz etkinlik yok.</p>
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
                      {ev.venue || "Belirsiz"} · {fmtDate(ev.start_date)}
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
      {role === "customer" ? (
        <CustomerDashboard />
      ) : role === "crew" ? (
        <CrewDashboard />
      ) : role === "sales" ? (
        <SalesDashboard />
      ) : (
        <AdminDashboard />
      )}
    </DashboardLayout>
  );
}
