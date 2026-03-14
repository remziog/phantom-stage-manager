import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateVehicle } from "@/hooks/useVehicles";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type VehicleType = Database["public"]["Enums"]["vehicle_type"];
type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];

const vehicleTypes = Constants.public.Enums.vehicle_type;
const vehicleStatuses = Constants.public.Enums.vehicle_status;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddVehicleDrawer({ open, onOpenChange }: Props) {
  const createVehicle = useCreateVehicle();
  const { data: teamMembers } = useTeamMembers();
  const drivers = teamMembers?.filter((m) => m.role === "Driver" && m.is_available) ?? [];

  const [form, setForm] = useState({
    name: "",
    type: "Truck" as VehicleType,
    license_plate: "",
    capacity_kg: "",
    capacity_volume_m3: "",
    daily_cost: 0,
    current_status: "In Garage" as VehicleStatus,
    driver_id: "",
    notes: "",
  });

  const update = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createVehicle.mutateAsync({
        name: form.name,
        type: form.type,
        license_plate: form.license_plate,
        capacity_kg: form.capacity_kg ? Number(form.capacity_kg) : null,
        capacity_volume_m3: form.capacity_volume_m3 ? Number(form.capacity_volume_m3) : null,
        daily_cost: form.daily_cost,
        current_status: form.current_status,
        driver_id: form.driver_id || null,
        notes: form.notes || null,
      });
      toast.success("Vehicle added");
      onOpenChange(false);
      setForm({ name: "", type: "Truck", license_plate: "", capacity_kg: "", capacity_volume_m3: "", daily_cost: 0, current_status: "In Garage", driver_id: "", notes: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to add vehicle");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground tracking-display">Add Vehicle</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Name *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} required className="bg-input border-border" placeholder="Truck #1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Type *</Label>
              <Select value={form.type} onValueChange={(v) => update("type", v)}>
                <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">License Plate *</Label>
              <Input value={form.license_plate} onChange={(e) => update("license_plate", e.target.value)} required className="bg-input border-border" placeholder="34 ABC 123" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Capacity (kg)</Label>
              <Input type="number" value={form.capacity_kg} onChange={(e) => update("capacity_kg", e.target.value)} className="bg-input border-border tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Volume (m³)</Label>
              <Input type="number" value={form.capacity_volume_m3} onChange={(e) => update("capacity_volume_m3", e.target.value)} className="bg-input border-border tabular-nums" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Daily Cost (₺) *</Label>
            <Input type="number" min={0} value={form.daily_cost} onChange={(e) => update("daily_cost", Number(e.target.value))} className="bg-input border-border tabular-nums" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={form.current_status} onValueChange={(v) => update("current_status", v)}>
                <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vehicleStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Assigned Driver</Label>
              <Select value={form.driver_id} onValueChange={(v) => update("driver_id", v)}>
                <SelectTrigger className="bg-input border-border"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="bg-input border-border resize-none" rows={3} />
          </div>

          <Button type="submit" className="w-full" disabled={createVehicle.isPending}>
            {createVehicle.isPending ? "Adding..." : "Add Vehicle"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
