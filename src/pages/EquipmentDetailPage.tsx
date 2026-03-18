import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { QRCodeSVG } from "qrcode.react";
import { useEquipment } from "@/hooks/useEquipment";
import { useEquipmentFaults, useUpdateFault } from "@/hooks/useEquipmentFaults";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  Wrench,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  MapPin,
  Zap,
  Weight,
  Hash,
  QrCode,
  Box,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

const conditionColors: Record<string, string> = {
  Excellent: "text-[hsl(var(--success))]",
  Good: "text-primary",
  Fair: "text-[hsl(var(--warning))]",
  "Needs Repair": "text-destructive",
};

const faultStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  open: { label: "Açık", variant: "destructive", icon: AlertTriangle },
  in_progress: { label: "İşlemde", variant: "outline", icon: Clock },
  resolved: { label: "Çözüldü", variant: "default", icon: CheckCircle },
};

const severityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Düşük", color: "text-muted-foreground" },
  medium: { label: "Orta", color: "text-[hsl(var(--warning))]" },
  high: { label: "Yüksek", color: "text-destructive" },
  critical: { label: "Kritik", color: "text-destructive font-bold" },
};

function useEquipmentEvents(equipmentId: string) {
  return useQuery({
    queryKey: ["equipment_events", equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_equipment")
        .select("*, events(id, name, start_date, end_date, status, venue)")
        .eq("equipment_id", equipmentId)
        .order("id", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        event: d.events,
      }));
    },
    enabled: !!equipmentId,
  });
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: equipment = [] } = useEquipment();
  const { data: faults = [] } = useEquipmentFaults(id);
  const { data: eventLinks = [] } = useEquipmentEvents(id || "");
  const { user, role } = useAuth();
  const updateFault = useUpdateFault();
  const isAdmin = role === "admin";

  const item = equipment.find((e) => e.id === id);

  const stats = useMemo(() => {
    const totalEvents = eventLinks.length;
    const totalFaults = faults.length;
    const openFaults = faults.filter((f) => f.status === "open").length;
    const resolvedFaults = faults.filter((f) => f.status === "resolved").length;
    return { totalEvents, totalFaults, openFaults, resolvedFaults };
  }, [eventLinks, faults]);

  if (!item) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-12">
          <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-sm text-muted-foreground">Ekipman bulunamadı</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link to="/equipment"><ArrowLeft className="h-4 w-4 mr-1" /> Listeye Dön</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleResolveFault = (faultId: string) => {
    if (!user) return;
    updateFault.mutate({
      id: faultId,
      status: "resolved",
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <Link to="/equipment"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <h1 className="text-xl font-semibold text-foreground">{item.name}</h1>
            </div>
            <div className="flex flex-wrap gap-2 ml-9">
              <Badge variant="outline">{item.category}</Badge>
              {item.subcategory && <Badge variant="secondary">{item.subcategory}</Badge>}
              <Badge variant="secondary" className={conditionColors[item.condition]}>{item.condition}</Badge>
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" />{item.current_location}
              </Badge>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <QRCodeSVG
              value={`${window.location.origin}/scan/${item.qr_code || item.id}`}
              size={64}
              level="H"
              includeMargin={false}
              className="rounded"
            />
            <p className="text-xs font-mono text-muted-foreground">{item.qr_code || "—"}</p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Etkinlik</p>
                <p className="text-lg font-semibold text-foreground">{stats.totalEvents}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Açık Arıza</p>
                <p className="text-lg font-semibold text-foreground">{stats.openFaults}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-[hsl(var(--success))]" />
              <div>
                <p className="text-xs text-muted-foreground">Çözülen</p>
                <p className="text-lg font-semibold text-foreground">{stats.resolvedFaults}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-[hsl(var(--warning))]" />
              <div>
                <p className="text-xs text-muted-foreground">Müsait</p>
                <p className="text-lg font-semibold text-foreground">{item.quantity_available} / {item.quantity_total}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info" className="gap-1.5 text-xs">
              <Package className="h-3.5 w-3.5" /> Bilgi
            </TabsTrigger>
            <TabsTrigger value="faults" className="gap-1.5 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" /> Arızalar ({faults.length})
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" /> Kullanım
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-1.5 text-xs">
              <Wrench className="h-3.5 w-3.5" /> Bakım
            </TabsTrigger>
          </TabsList>

          {/* Info tab */}
          <TabsContent value="info">
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <InfoRow icon={Package} label="Kategori / Alt Kategori" value={[item.category, item.subcategory].filter(Boolean).join(" / ")} />
                  <InfoRow icon={Box} label="Marka / Model" value={[item.brand, item.model].filter(Boolean).join(" ") || "—"} />
                  <InfoRow icon={Hash} label="Seri Numarası" value={item.serial_number || "—"} />
                  <InfoRow icon={QrCode} label="QR Kod" value={item.qr_code || "—"} />
                  <InfoRow icon={Weight} label="Ağırlık" value={item.weight_kg ? `${item.weight_kg} kg` : "—"} />
                  <InfoRow icon={Zap} label="Güç Tüketimi" value={item.power_consumption_watts ? `${item.power_consumption_watts} W` : "—"} />
                  <InfoRow icon={Box} label="Case Başına Adet" value={item.items_per_case ? `${item.items_per_case} adet` : "—"} />
                  <InfoRow icon={Weight} label="Case Ağırlığı" value={item.case_weight_kg ? `${item.case_weight_kg} kg` : "—"} />
                  <InfoRow icon={Box} label="Case Hacmi" value={item.case_volume_m3 ? `${item.case_volume_m3} m³` : "—"} />
                  <InfoRow icon={MapPin} label="Konum" value={item.current_location} />
                </div>
                <Separator className="my-3" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2 rounded-md bg-muted/30">
                    <p className="text-xs text-muted-foreground">Depoda</p>
                    <p className="text-lg font-semibold text-foreground">{item.qty_in_warehouse}</p>
                  </div>
                  <div className="p-2 rounded-md bg-muted/30">
                    <p className="text-xs text-muted-foreground">Kirada</p>
                    <p className="text-lg font-semibold text-foreground">{item.qty_on_rent}</p>
                  </div>
                  <div className="p-2 rounded-md bg-muted/30">
                    <p className="text-xs text-muted-foreground">Tamirde</p>
                    <p className="text-lg font-semibold text-foreground">{item.qty_in_repair}</p>
                  </div>
                  <div className="p-2 rounded-md bg-muted/30">
                    <p className="text-xs text-muted-foreground">Servis Dışı</p>
                    <p className="text-lg font-semibold text-foreground">{item.qty_out_of_service}</p>
                  </div>
                </div>
                {item.notes && (
                  <>
                    <Separator className="my-3" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notlar</p>
                      <p className="text-sm text-foreground">{item.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Faults tab */}
          <TabsContent value="faults">
            {faults.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-10 w-10 text-[hsl(var(--success))]/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Bu ekipmanda kayıtlı arıza yok.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {faults.map((fault) => {
                  const sc = faultStatusConfig[fault.status] || faultStatusConfig.open;
                  const sv = severityConfig[fault.severity] || severityConfig.medium;
                  const Icon = sc.icon;
                  return (
                    <Card key={fault.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={sc.variant} className="gap-1">
                              <Icon className="h-3 w-3" />{sc.label}
                            </Badge>
                            <span className={`text-xs font-medium ${sv.color}`}>{sv.label}</span>
                            <Badge variant="outline" className="text-[10px]">{fault.fault_type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(fault.created_at), "dd MMM yyyy HH:mm", { locale: tr })}
                          </p>
                        </div>
                        <p className="text-sm text-foreground mb-2">{fault.description}</p>
                        {fault.photo_urls && fault.photo_urls.length > 0 && (
                          <div className="flex gap-2 mb-2">
                            {fault.photo_urls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt={`Arıza fotoğrafı ${i + 1}`} className="h-16 w-16 rounded-md object-cover border border-border" />
                              </a>
                            ))}
                          </div>
                        )}
                        {fault.resolution_notes && (
                          <div className="bg-muted/30 rounded-md p-2 mt-2">
                            <p className="text-xs text-muted-foreground">Çözüm Notu</p>
                            <p className="text-sm text-foreground">{fault.resolution_notes}</p>
                          </div>
                        )}
                        {isAdmin && fault.status === "open" && (
                          <div className="mt-3">
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleResolveFault(fault.id)}>
                              <CheckCircle className="h-3.5 w-3.5" /> Çözüldü Olarak İşaretle
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Usage tab */}
          <TabsContent value="usage">
            {eventLinks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Bu ekipman henüz bir etkinlikte kullanılmadı.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden phantom-shadow">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-card">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Etkinlik</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Tarih</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Mekan</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Durum</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Adet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventLinks.map((link: any, index: number) => (
                      <tr key={link.id} className="border-b border-border last:border-0 hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                        style={index % 2 === 1 ? { backgroundColor: "rgba(255,255,255,0.02)" } : {}}>
                        <td className="px-4 py-3">
                          <Link to={`/events/${link.event?.id}`} className="font-medium text-primary hover:underline">
                            {link.event?.name || "—"}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {link.event?.start_date
                            ? `${format(new Date(link.event.start_date), "dd MMM", { locale: tr })} - ${format(new Date(link.event.end_date), "dd MMM yyyy", { locale: tr })}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{link.event?.venue || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{link.event?.status || "—"}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{link.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Maintenance tab */}
          <TabsContent value="maintenance">
            <div className="space-y-4">
              {/* Condition summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Bakım Durumu</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Mevcut Kondisyon</p>
                      <p className={`text-lg font-semibold ${conditionColors[item.condition]}`}>{item.condition}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tamirdeki Adet</p>
                      <p className="text-lg font-semibold text-foreground">{item.qty_in_repair}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Toplam Arıza Kaydı</p>
                      <p className="text-lg font-semibold text-foreground">{stats.totalFaults}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Açık Arıza</p>
                      <p className={`text-lg font-semibold ${stats.openFaults > 0 ? "text-destructive" : "text-[hsl(var(--success))]"}`}>
                        {stats.openFaults}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent resolved faults */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Son Çözülen Arızalar</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {faults.filter((f) => f.status === "resolved").length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Çözülen arıza kaydı yok.</p>
                  ) : (
                    <div className="space-y-2">
                      {faults
                        .filter((f) => f.status === "resolved")
                        .slice(0, 5)
                        .map((fault) => (
                          <div key={fault.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{fault.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {fault.resolved_at && format(new Date(fault.resolved_at), "dd MMM yyyy", { locale: tr })}
                              </p>
                            </div>
                            <Badge variant="default" className="gap-1 shrink-0 ml-2">
                              <CheckCircle className="h-3 w-3" /> Çözüldü
                            </Badge>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Maintenance recommendations */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Bakım Önerileri</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2">
                    {item.condition === "Needs Repair" && (
                      <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10">
                        <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <p className="text-sm text-destructive">Bu ekipman tamir gerektiriyor. Servis planlaması yapılmalı.</p>
                      </div>
                    )}
                    {item.condition === "Fair" && (
                      <div className="flex items-start gap-2 p-2 rounded-md bg-[hsl(var(--warning))]/10">
                        <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))] mt-0.5 shrink-0" />
                        <p className="text-sm text-[hsl(var(--warning))]">Kondisyon orta seviyede. Yakın zamanda bakım planlanmalı.</p>
                      </div>
                    )}
                    {stats.openFaults > 0 && (
                      <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <p className="text-sm text-destructive">{stats.openFaults} adet çözülmemiş arıza kaydı bulunuyor.</p>
                      </div>
                    )}
                    {item.condition === "Excellent" && stats.openFaults === 0 && (
                      <div className="flex items-start gap-2 p-2 rounded-md bg-[hsl(var(--success))]/10">
                        <CheckCircle className="h-4 w-4 text-[hsl(var(--success))] mt-0.5 shrink-0" />
                        <p className="text-sm text-[hsl(var(--success))]">Ekipman mükemmel durumda. Acil bakım gerekmiyor.</p>
                      </div>
                    )}
                    {item.condition === "Good" && stats.openFaults === 0 && (
                      <div className="flex items-start gap-2 p-2 rounded-md bg-[hsl(var(--success))]/10">
                        <CheckCircle className="h-4 w-4 text-[hsl(var(--success))] mt-0.5 shrink-0" />
                        <p className="text-sm text-[hsl(var(--success))]">Ekipman iyi durumda. Rutin bakım yeterli.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
