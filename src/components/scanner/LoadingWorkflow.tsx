import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useEvents } from "@/hooks/useEvents";
import { useVehicles } from "@/hooks/useVehicles";
import { useLoadingLists, useLoadingListItems, useCreateLoadingList, useAddLoadingListItem, useUpdateLoadingList } from "@/hooks/useLoadingLists";
import { Truck, Plus, CheckCircle, Package, ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";

interface LoadingWorkflowProps {
  equipment: { id: string; name: string; qr_code: string | null };
  userId: string;
}

export function LoadingWorkflow({ equipment, userId }: LoadingWorkflowProps) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"load" | "unload">("load");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const { data: events = [] } = useEvents();
  const { data: vehicles = [] } = useVehicles();
  const { data: loadingLists = [] } = useLoadingLists(eventId || undefined);
  const { data: listItems = [] } = useLoadingListItems(selectedListId || undefined);

  const createList = useCreateLoadingList();
  const addItem = useAddLoadingListItem();
  const updateList = useUpdateLoadingList();

  const activeEvents = events.filter((e) => e.status !== "Completed" && e.status !== "Cancelled");
  const filteredLists = loadingLists.filter((l) => l.status === "pending" || l.status === "in_progress");

  const handleCreateList = async () => {
    if (!eventId || !vehicleId) {
      toast.error("Etkinlik ve araç seçiniz");
      return;
    }
    const list = await createList.mutateAsync({
      event_id: eventId,
      vehicle_id: vehicleId,
      direction,
      created_by: userId,
    });
    setSelectedListId(list.id);
  };

  const handleAddToList = async () => {
    if (!selectedListId) {
      toast.error("Yükleme listesi seçin veya oluşturun");
      return;
    }
    // Check if already in list
    const existing = listItems.find((item) => item.equipment_id === equipment.id);
    if (existing) {
      toast.info("Bu ekipman zaten listede");
      return;
    }
    await addItem.mutateAsync({
      loading_list_id: selectedListId,
      equipment_id: equipment.id,
      quantity: 1,
      scanned_by: userId,
    });
  };

  const handleComplete = async () => {
    if (!selectedListId) return;
    await updateList.mutateAsync({
      id: selectedListId,
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    setSelectedListId(null);
  };

  const getVehicleName = (vId: string) => {
    const v = vehicles.find((ve) => ve.id === vId);
    return v ? `${v.name} (${v.license_plate})` : vId;
  };

  return (
    <div className="space-y-4">
      {/* Step 1: Select event & vehicle */}
      <Card>
        <CardHeader className="p-3">
          <CardTitle className="text-sm">1. Etkinlik & Araç Seçin</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          <div>
            <Label className="text-xs">Etkinlik</Label>
            <Select value={eventId || "none"} onValueChange={(v) => { setEventId(v === "none" ? null : v); setSelectedListId(null); }}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Etkinlik seçin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Seçin —</SelectItem>
                {activeEvents.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Araç</Label>
              <Select value={vehicleId || "none"} onValueChange={(v) => setVehicleId(v === "none" ? null : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Araç seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Seçin —</SelectItem>
                  {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.name} ({v.license_plate})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Yön</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as "load" | "unload")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="load">Yükleme</SelectItem>
                  <SelectItem value="unload">Boşaltma</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={handleCreateList} disabled={!eventId || !vehicleId} className="gap-1.5 w-full">
            <Plus className="h-3.5 w-3.5" /> Yeni Yükleme Listesi Oluştur
          </Button>
        </CardContent>
      </Card>

      {/* Existing lists */}
      {eventId && filteredLists.length > 0 && (
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Mevcut Listeler</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {filteredLists.map((list) => (
              <button
                key={list.id}
                onClick={() => setSelectedListId(list.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors ${
                  selectedListId === list.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {list.direction === "load" ? <ArrowUp className="h-4 w-4 text-primary" /> : <ArrowDown className="h-4 w-4 text-[hsl(var(--warning))]"/>}
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {getVehicleName(list.vehicle_id)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {list.direction === "load" ? "Yükleme" : "Boşaltma"} · {new Date(list.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <Badge variant={list.status === "pending" ? "secondary" : "default"} className="text-xs">
                  {list.status === "pending" ? "Bekliyor" : "Devam"}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Add to list */}
      {selectedListId && (
        <Card className="border-primary/20">
          <CardHeader className="p-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              2. Ekipmanı Ekle
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/50">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{equipment.name}</span>
              {equipment.qr_code && <Badge variant="outline" className="text-xs ml-auto">{equipment.qr_code}</Badge>}
            </div>

            <Button onClick={handleAddToList} className="w-full gap-2" disabled={addItem.isPending}>
              <Plus className="h-4 w-4" />
              {addItem.isPending ? "Ekleniyor…" : "Listeye Ekle"}
            </Button>

            {/* Show list items */}
            {listItems.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground font-medium">Listede {listItems.length} ekipman</p>
                {listItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/30">
                    <CheckCircle className="h-3 w-3 text-[hsl(var(--success))]" />
                    <span className="text-foreground">{item.equipment_id.slice(0, 8)}…</span>
                    <span className="text-muted-foreground ml-auto">
                      {new Date(item.scanned_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" size="sm" onClick={handleComplete} className="w-full gap-1.5" disabled={listItems.length === 0}>
              <CheckCircle className="h-3.5 w-3.5" /> Yüklemeyi Tamamla
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
