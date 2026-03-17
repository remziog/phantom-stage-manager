import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import type { Event, EventStatus } from "@/hooks/useEvents";

const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const dotColors: Record<EventStatus, string> = {
  Planning: "bg-muted-foreground",
  Confirmed: "bg-primary",
  "In Progress": "bg-[hsl(var(--warning))]",
  Completed: "bg-[hsl(var(--success))]",
  Cancelled: "bg-destructive",
};

interface Props { events: Event[]; currentMonth: Date; onMonthChange: (d: Date) => void; }

export function EventCalendar({ events, currentMonth, onMonthChange }: Props) {
  const navigate = useNavigate();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const prev = () => onMonthChange(new Date(year, month - 1, 1));
  const next = () => onMonthChange(new Date(year, month + 1, 1));
  const goToday = () => onMonthChange(new Date());

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startOffset = (firstDay.getDay() + 6) % 7;
    const rows: { date: Date; inMonth: boolean }[][] = [];
    let current = new Date(year, month, 1 - startOffset);
    while (current <= lastDay || rows.length === 0 || rows[rows.length - 1].length < 7) {
      if (!rows.length || rows[rows.length - 1].length === 7) rows.push([]);
      rows[rows.length - 1].push({ date: new Date(current), inMonth: current.getMonth() === month });
      current.setDate(current.getDate() + 1);
      if (rows.length > 6) break;
    }
    while (rows[rows.length - 1].length < 7) {
      rows[rows.length - 1].push({ date: new Date(current), inMonth: false });
      current.setDate(current.getDate() + 1);
    }
    return rows;
  }, [year, month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const ev of events) {
      const start = new Date(ev.start_date);
      const end = new Date(ev.end_date);
      const d = new Date(start);
      while (d <= end) {
        const key = d.toISOString().split("T")[0];
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
        d.setDate(d.getDate() + 1);
      }
    }
    return map;
  }, [events]);

  const todayStr = new Date().toISOString().split("T")[0];
  const monthLabel = currentMonth.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground capitalize">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={goToday}>Bugün</Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-7 bg-secondary/50">
          {DAYS.map((d) => (
            <div key={d} className="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground border-b border-border">{d}</div>
          ))}
        </div>
        {cells.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map(({ date, inMonth }, di) => {
              const key = date.toISOString().split("T")[0];
              const dayEvents = eventsByDate.get(key) || [];
              const isToday = key === todayStr;
              return (
                <div key={di} className={`min-h-[80px] border-b border-r border-border p-1 transition-colors ${!inMonth ? "bg-secondary/20" : "bg-card"} ${di === 6 ? "border-r-0" : ""} ${wi === cells.length - 1 ? "border-b-0" : ""}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-xs leading-5 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground font-bold" : inMonth ? "text-foreground" : "text-muted-foreground/40"}`}>
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <button key={ev.id} onClick={() => navigate(`/events/${ev.id}`)} className="w-full flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight text-foreground truncate hover:bg-secondary/80 transition-colors text-left" title={`${ev.name} — ${ev.customer_name}`}>
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColors[ev.status]}`} />
                        <span className="truncate">{ev.name}</span>
                      </button>
                    ))}
                    {dayEvents.length > 3 && <span className="block text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3} daha</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}