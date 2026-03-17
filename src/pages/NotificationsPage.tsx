import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell, FileText, Calendar, CheckCircle, XCircle, Info,
  CheckCheck, Eye, Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  quote_created: { icon: FileText, color: "text-primary", label: "Teklif Oluşturuldu" },
  event_status: { icon: Calendar, color: "text-accent", label: "Etkinlik Güncelleme" },
  quote_approved: { icon: CheckCircle, color: "text-[hsl(var(--success))]", label: "Teklif Onaylandı" },
  quote_rejected: { icon: XCircle, color: "text-destructive", label: "Teklif Reddedildi" },
  quote_request: { icon: FileText, color: "text-[hsl(var(--warning))]", label: "Teklif Talebi" },
  info: { icon: Info, color: "text-muted-foreground", label: "Bilgi" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins}dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}sa önce`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}g önce`;
  return new Date(dateStr).toLocaleDateString("tr-TR");
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkAsRead();
  const markAllRead = useMarkAllAsRead();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");

  const types = useMemo(() => {
    const set = new Set(notifications.map((n) => n.type));
    return Array.from(set);
  }, [notifications]);

  const filtered = useMemo(() => {
    let list = notifications;
    if (typeFilter !== "all") list = list.filter((n) => n.type === typeFilter);
    if (readFilter === "unread") list = list.filter((n) => !n.is_read);
    if (readFilter === "read") list = list.filter((n) => n.is_read);
    return list;
  }, [notifications, typeFilter, readFilter]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleClick = (n: (typeof notifications)[0]) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.reference_id && n.reference_type) {
      navigate(`/${n.reference_type === "quote" ? "quotes" : "events"}/${n.reference_id}`);
    }
  };

  const handleMarkSelected = () => {
    filtered.filter((n) => !n.is_read).forEach((n) => markRead.mutate(n.id));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Bildirimler</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} okunmamış` : "Hepsi okundu"} · {notifications.length} toplam
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="h-4 w-4" /> Tümünü okundu yap
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="phantom-shadow border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-secondary p-2.5 text-primary">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Toplam</p>
                <p className="text-lg font-semibold text-foreground">{notifications.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="phantom-shadow border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-secondary p-2.5 text-[hsl(var(--warning))]">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Okunmamış</p>
                <p className="text-lg font-semibold text-foreground">{unreadCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="phantom-shadow border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-secondary p-2.5 text-[hsl(var(--success))]">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Okunmuş</p>
                <p className="text-lg font-semibold text-foreground">{notifications.length - unreadCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="phantom-shadow border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-secondary p-2.5 text-accent">
                <Filter className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gösterilen</p>
                <p className="text-lg font-semibold text-foreground">{filtered.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tür" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Türler</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {typeConfig[t]?.label || t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={readFilter} onValueChange={setReadFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="unread">Okunmamış</SelectItem>
              <SelectItem value="read">Okunmuş</SelectItem>
            </SelectContent>
          </Select>
          {filtered.some((n) => !n.is_read) && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={handleMarkSelected}>
              Filtrelenenleri okundu yap
            </Button>
          )}
        </div>

        <Card className="phantom-shadow border-border/50">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <p className="text-sm text-muted-foreground">Bildirimler yükleniyor…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Bell className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Bildirim bulunamadı.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="divide-y divide-border">
                {filtered.map((n) => {
                  const config = typeConfig[n.type] || typeConfig.info;
                  const Icon = config.icon;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/50 ${
                        !n.is_read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className={`mt-0.5 rounded-lg bg-secondary p-2 ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "text-foreground"}`}>
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-muted-foreground/60">{timeAgo(n.created_at)}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded bg-secondary ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}