import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useVehicles, useUpdateVehicle, type VehicleWithDriver } from "@/hooks/useVehicles";
import { AddVehicleDrawer } from "@/components/logistics/AddVehicleDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Truck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Constants } from "@/integrations/supabase/types";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];

const vehicleTypes = Constants.public.Enums.vehicle_type;
const vehicleStatuses = Constants.public.Enums.vehicle_status;

const statusStyles: Record<VehicleStatus, string> = {
  "In Garage": "bg-success/15 text-success border-success/20",
  "On Route": "bg-warning/15 text-warning border-warning/20",
  "On Event Site": "bg-primary/15 text-primary border-primary/20",
  "Under Maintenance": "bg-destructive/15 text-destructive border-destructive/20",
};

const typeIcons: Record<string, string> = {
  Truck: "🚛", Van: "🚐", Trailer: "🚚", Crane: "🏗️", Other: "🔧",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount);

function VehicleCard({ vehicle, onToggle }: { vehicle: VehicleWithDriver; onToggle: () => void }) {
  return (
    <div className="rounded-lg bg-card p-5 phantom-shadow hover:bg-surface-hover transition-colors duration-200 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{typeIcons[vehicle.type] || "🔧"}</span>
          <div>
            <h3 className="font-medium text-foreground">{vehicle.name}</h3>
            <p className="text-xs text-muted-foreground">{vehicle.license_plate}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn("text-[10px] uppercase tracking-widest font-semibold rounded px-2 py-0.5", statusStyles[vehicle.current_status])}
        >
          {vehicle.current_status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {vehicle.capacity_kg && (
          <div>
            <span className="text-muted-foreground">Capacity:</span>{" "}
            <span className="text-foreground tabular-nums">{vehicle.capacity_kg.toLocaleString()} kg</span>
          </div>
        )}
        {vehicle.capacity_volume_m3 && (
          <div>
            <span className="text-muted-foreground">Volume:</span>{" "}
            <span className="text-foreground tabular-nums">{vehicle.capacity_volume_m3} m³</span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Cost/Day:</span>{" "}
          <span className="text-foreground tabular-nums">{formatCurrency(vehicle.daily_cost)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Type:</span>{" "}
          <span className="text-foreground">{vehicle.type}</span>
        </div>
      </div>

      {/* Driver */}
      <div className="flex items-center gap-2 text-xs">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Driver:</span>
        <span className="text-foreground">{vehicle.team_members?.full_name || "Unassigned"}</span>
      </div>

      {/* Availability toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className={cn("text-xs font-medium", vehicle.is_available ? "text-success" : "text-muted-foreground")}>
          {vehicle.is_available ? "Available" : "Unavailable"}
        </span>
        <Switch checked={vehicle.is_available} onCheckedChange={onToggle} />
      </div>
    </div>
  );
}

export default function LogisticsPage() {
  const { data: vehicles, isLoading } = useVehicles();
  const updateVehicle = useUpdateVehicle();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [availFilter, setAvailFilter] = useState("all");

  const filtered = useMemo(() => {
    if (!vehicles) return [];
    return vehicles.filter((v) => {
      const matchType = typeFilter === "all" || v.type === typeFilter;
      const matchStatus = statusFilter === "all" || v.current_status === statusFilter;
      const matchAvail = availFilter === "all" || (availFilter === "available" ? v.is_available : !v.is_available);
      return matchType && matchStatus && matchAvail;
    });
  }, [vehicles, typeFilter, statusFilter, availFilter]);

  const toggleAvailability = async (id: string, current: boolean) => {
    try {
      await updateVehicle.mutateAsync({ id, is_available: !current });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-display text-foreground">Logistics</h1>
            <p className="text-sm text-muted-foreground">
              {vehicles?.length ?? 0} vehicles. {vehicles?.filter((v) => v.is_available).length ?? 0} available.
            </p>
          </div>
          <Button onClick={() => setDrawerOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Vehicle
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] bg-input border-border"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {vehicleTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-input border-border"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {vehicleStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={availFilter} onValueChange={setAvailFilter}>
            <SelectTrigger className="w-[150px] bg-input border-border"><SelectValue placeholder="Availability" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="rounded-lg bg-card p-12 phantom-shadow flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading vehicles...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg bg-card p-12 phantom-shadow flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground">
              {vehicles?.length === 0 ? "No vehicles in fleet." : "No vehicles match your filters."}
            </p>
            {vehicles?.length === 0 ? (
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Vehicle
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setAvailFilter("all"); }}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((v) => (
              <VehicleCard key={v.id} vehicle={v} onToggle={() => toggleAvailability(v.id, v.is_available)} />
            ))}
          </div>
        )}
      </div>
      <AddVehicleDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </DashboardLayout>
  );
}
