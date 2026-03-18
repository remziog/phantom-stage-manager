import { useState } from "react";
import { useLoadingLists } from "@/hooks/useLoadingLists";
import { useVehicles } from "@/hooks/useVehicles";
import { useEvents } from "@/hooks/useEvents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUp, ArrowDown, Truck, CheckCircle, Clock, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/20",
  in_progress: "bg-primary/15 text-primary border-primary/20",
  completed: "bg-success/15 text-success border-success/20",
};

const statusLabels: Record<string, string> = {
  pending: "Bekliyor",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
};

export function LoadingListsSection() {
  const { data: lists = [], isLoading } = useLoadingLists();
  const { data: vehicles = [] } = useVehicles();
  const { data: events = [] } = useEvents();
  const [tab, setTab] = useState("active");

  const getVehicle = (id: string) => vehicles.find((v) => v.id === id);
  const getEvent = (id: string) => events.find((e) => e.id === id);

  const activeLists = lists.filter((l) => l.status === "pending" || l.status === "in_progress");
  const completedLists = lists.filter((l) => l.status === "completed");

  const currentLists = tab === "active" ? activeLists : completedLists;

  if (isLoading) {
    return (
      <div className="rounded-lg bg-card p-8 phantom-shadow flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Yükleme listeleri yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Yükleme Listeleri</h2>
          <p className="text-xs text-muted-foreground">
            {activeLists.length} aktif · {completedLists.length} tamamlanmış
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="active" className="gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" /> Aktif ({activeLists.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5 text-xs">
            <CheckCircle className="h-3.5 w-3.5" /> Tamamlanan ({completedLists.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-3">
          {currentLists.length === 0 ? (
            <div className="rounded-lg bg-card p-8 phantom-shadow flex flex-col items-center justify-center gap-2">
              <Package className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {tab === "active" ? "Aktif yükleme listesi yok." : "Tamamlanmış yükleme listesi yok."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentLists.map((list) => {
                const vehicle = getVehicle(list.vehicle_id);
                const event = getEvent(list.event_id);
                return (
                  <div
                    key={list.id}
                    className="rounded-lg bg-card p-4 phantom-shadow hover:bg-surface-hover transition-colors duration-200 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        {list.direction === "load" ? (
                          <div className="rounded-md bg-primary/10 p-1.5">
                            <ArrowUp className="h-4 w-4 text-primary" />
                          </div>
                        ) : (
                          <div className="rounded-md bg-warning/10 p-1.5">
                            <ArrowDown className="h-4 w-4 text-warning" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {list.direction === "load" ? "Yükleme" : "Boşaltma"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(list.created_at).toLocaleDateString("tr-TR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] uppercase tracking-widest font-semibold rounded px-2 py-0.5",
                          statusStyles[list.status] || ""
                        )}
                      >
                        {statusLabels[list.status] || list.status}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Araç:</span>
                        <span className="text-foreground font-medium">
                          {vehicle ? `${vehicle.name} (${vehicle.license_plate})` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Etkinlik:</span>
                        <span className="text-foreground font-medium">{event?.name || "—"}</span>
                      </div>
                    </div>

                    {list.completed_at && (
                      <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                        Tamamlandı:{" "}
                        {new Date(list.completed_at).toLocaleDateString("tr-TR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}

                    {list.notes && (
                      <p className="text-xs text-muted-foreground italic">{list.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
