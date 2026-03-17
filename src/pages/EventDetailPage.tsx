import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  useEvent, useEventEquipment, useEventTeam, useEventVehicles,
  useUpdateEvent, useAssignEquipment, useAssignTeam, useAssignVehicle, useRemoveAssignment,
  type EventStatus,
} from "@/hooks/useEvents";
import { useEquipment } from "@/hooks/useEquipment";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useVehicles } from "@/hooks/useVehicles";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Calendar, MapPin, User, Package, Truck, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const statuses: EventStatus[] = ["Planning", "Confirmed", "In Progress", "Completed", "Cancelled"];
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("tr-TR") : "—";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(id);
  const { data: eqAssignments = [] } = useEventEquipment(id);
  const { data: teamAssignments = [] } = useEventTeam(id);
  const { data: vehicleAssignments = [] } = useEventVehicles(id);
  const updateEvent = useUpdateEvent();
  const assignEquipment = useAssignEquipment();
  const assignTeam = useAssignTeam();
  const assignVehicle = useAssignVehicle();
  const removeAssignment = useRemoveAssignment();

  const { data: allEquipment = [] } = useEquipment();
  const { data: allTeam = [] } = useTeamMembers();
  const { data: allVehicles = [] } = useVehicles();

  const [eqSelect, setEqSelect] = useState("");
  const [tmSelect, setTmSelect] = useState("");
  const [vhSelect, setVhSelect] = useState("");

  if (isLoading || !event) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-12">
          <p className="text-sm text-muted-foreground">Etkinlik yükleniyor…</p>
        </div>
      </DashboardLayout>
    );
  }

  const assignedEqIds = new Set(eqAssignments.map((a) => a.equipment_id));
  const assignedTmIds = new Set(teamAssignments.map((a) => a.team_member_id));
  const assignedVhIds = new Set(vehicleAssignments.map((a) => a.vehicle_id));

  const availableEq = allEquipment.filter((e) => !assignedEqIds.has(e.id));
  const availableTm = allTeam.filter((t) => !assignedTmIds.has(t.id));
  const availableVh = allVehicles.filter((v) => !assignedVhIds.has(v.id));

  const days = Math.max(1, Math.ceil((new Date(event.end_date).getTime() - new Date(event.start_date).getTime()) / 86400000) + 1);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/events")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">{event.name}</h1>
              <EventStatusBadge status={event.status} />
            </div>
            <p className="text-sm text-muted-foreground">{event.customer_name}</p>
          </div>
          <Select value={event.status} onValueChange={(v) => updateEvent.mutate({ id: event.id, status: v as EventStatus })}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="phantom-shadow border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Etkinlik Tarihleri</p>
                <p className="text-sm font-medium text-foreground">{fmtDate(event.start_date)} — {fmtDate(event.end_date)}</p>
                <p className="text-xs text-muted-foreground">{days} gün</p>
              </div>
            </CardContent>
          </Card>
          <Card className="phantom-shadow border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <MapPin className="h-5 w-5 text-[hsl(var(--warning))]" />
              <div>
                <p className="text-xs text-muted-foreground">Mekan</p>
                <p className="text-sm font-medium text-foreground">{event.venue || "Belirsiz"}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="phantom-shadow border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Building2 className="h-5 w-5 text-accent" />
              <div>
                <p className="text-xs text-muted-foreground">Kurulum / Söküm</p>
                <p className="text-sm font-medium text-foreground">{fmtDate(event.load_in_date)} / {fmtDate(event.load_out_date)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="phantom-shadow border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <User className="h-5 w-5 text-[hsl(var(--success))]" />
              <div>
                <p className="text-xs text-muted-foreground">Kaynaklar</p>
                <p className="text-sm font-medium text-foreground">
                  {eqAssignments.length} ekipman · {teamAssignments.length} ekip · {vehicleAssignments.length} araç
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="phantom-shadow border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-primary" /> Ekipman ({eqAssignments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {eqAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
                  <div>
                    <p className="text-sm text-foreground">{a.equipment?.name}</p>
                    <p className="text-xs text-muted-foreground">Adet: {a.quantity} · {a.equipment?.category}</p>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => removeAssignment.mutate({ table: "event_equipment", id: a.id, eventId: event.id })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Select value={eqSelect} onValueChange={setEqSelect}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Ekipman ekle…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEq.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon" className="h-8 w-8" disabled={!eqSelect}
                  onClick={() => { assignEquipment.mutate({ event_id: event.id, equipment_id: eqSelect }); setEqSelect(""); }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="phantom-shadow border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-[hsl(var(--success))]" /> Ekip ({teamAssignments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {teamAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
                  <div>
                    <p className="text-sm text-foreground">{a.team_member?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{a.team_member?.role}</p>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => removeAssignment.mutate({ table: "event_team", id: a.id, eventId: event.id })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Select value={tmSelect} onValueChange={setTmSelect}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Ekip üyesi ekle…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTm.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.full_name} — {t.role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon" className="h-8 w-8" disabled={!tmSelect}
                  onClick={() => { assignTeam.mutate({ event_id: event.id, team_member_id: tmSelect }); setTmSelect(""); }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="phantom-shadow border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-[hsl(var(--warning))]" /> Araçlar ({vehicleAssignments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {vehicleAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
                  <div>
                    <p className="text-sm text-foreground">{a.vehicle?.name}</p>
                    <p className="text-xs text-muted-foreground">{a.vehicle?.license_plate}</p>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => removeAssignment.mutate({ table: "event_vehicles", id: a.id, eventId: event.id })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Select value={vhSelect} onValueChange={setVhSelect}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Araç ekle…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVh.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name} — {v.license_plate}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon" className="h-8 w-8" disabled={!vhSelect}
                  onClick={() => { assignVehicle.mutate({ event_id: event.id, vehicle_id: vhSelect }); setVhSelect(""); }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {event.notes && (
          <Card className="phantom-shadow border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notlar</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{event.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}