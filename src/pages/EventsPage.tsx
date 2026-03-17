import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useEvents, type EventStatus } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { CreateEventDialog } from "@/components/events/CreateEventDialog";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { EventCalendar } from "@/components/events/EventCalendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, CalendarDays, CheckCircle2, Clock, Zap, MapPin, Building2, Eye, List, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });

const fmtFull = (d: string) =>
  new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });

const statuses: EventStatus[] = ["Planning", "Confirmed", "In Progress", "Completed", "Cancelled"];

const statusColors: Record<EventStatus, string> = {
  Planning: "border-l-muted-foreground",
  Confirmed: "border-l-primary",
  "In Progress": "border-l-[hsl(var(--warning))]",
  Completed: "border-l-[hsl(var(--success))]",
  Cancelled: "border-l-destructive",
};

export default function EventsPage() {
  const { data: events = [], isLoading } = useEvents();
  const { role } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin" || role === "team_member" || role === "sales";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calMonth, setCalMonth] = useState(new Date());

  const filtered = useMemo(() => {
    let list = events;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.customer_name.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") list = list.filter((e) => e.status === statusFilter);
    return list;
  }, [events, search, statusFilter]);

  const today = new Date().toISOString().split("T")[0];
  const upcoming = events.filter((e) => e.start_date >= today && e.status !== "Cancelled").length;
  const inProgress = events.filter((e) => e.status === "In Progress").length;
  const completed = events.filter((e) => e.status === "Completed").length;

  const stats = [
    { label: "Toplam Etkinlik", value: events.length, icon: CalendarDays, color: "text-primary" },
    { label: "Yaklaşan", value: upcoming, icon: Clock, color: "text-accent" },
    { label: "Devam Eden", value: inProgress, icon: Zap, color: "text-[hsl(var(--warning))]" },
    { label: "Tamamlanan", value: completed, icon: CheckCircle2, color: "text-[hsl(var(--success))]" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {isAdmin ? "Etkinlikler" : "Etkinliklerim"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? "Aktif ve yaklaşan etkinlikleri kaynak atamalarıyla takip edin." : "Etkinlik durumunuzu ve detaylarınızı görüntüleyin."}
            </p>
          </div>
          {isAdmin && <CreateEventDialog />}
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="phantom-shadow border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-lg bg-secondary p-2.5 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-semibold text-foreground">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Etkinlik ara…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar")}>
            <TabsList className="h-9">
              <TabsTrigger value="list" className="px-2.5">
                <List className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="calendar" className="px-2.5">
                <LayoutGrid className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <p className="text-sm text-muted-foreground">Etkinlikler yükleniyor…</p>
          </div>
        ) : view === "calendar" ? (
          <EventCalendar events={filtered} currentMonth={calMonth} onMonthChange={setCalMonth} />
        ) : filtered.length === 0 ? (
          <Card className="phantom-shadow border-border/50">
            <CardContent className="flex items-center justify-center p-12">
              <p className="text-sm text-muted-foreground">Etkinlik bulunamadı.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((event) => {
              const days = Math.max(1, Math.ceil((new Date(event.end_date).getTime() - new Date(event.start_date).getTime()) / 86400000) + 1);
              return (
                <Card
                  key={event.id}
                  className={`phantom-shadow border-border/50 border-l-4 ${statusColors[event.status]} cursor-pointer transition-colors hover:bg-secondary/50`}
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">{event.name}</h3>
                          <EventStatusBadge status={event.status} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {event.customer_name}
                          </span>
                          {event.venue && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.venue}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {fmt(event.start_date)}
                            {event.start_date !== event.end_date && ` — ${fmt(event.end_date)}`}
                            {" "}({days} gün)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {fmtFull(event.start_date)}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}