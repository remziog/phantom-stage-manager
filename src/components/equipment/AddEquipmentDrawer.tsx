import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreateEquipment } from "@/hooks/useEquipment";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type EquipmentCategory = Database["public"]["Enums"]["equipment_category"];
type EquipmentCondition = Database["public"]["Enums"]["equipment_condition"];
type EquipmentLocation = Database["public"]["Enums"]["equipment_location"];

const categories = Constants.public.Enums.equipment_category;
const conditions = Constants.public.Enums.equipment_condition;
const locations = Constants.public.Enums.equipment_location;

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }

const initialForm = {
  name: "", category: "Light" as EquipmentCategory, subcategory: "", brand: "", model: "",
  serial_number: "", quantity_total: 1, quantity_available: 1, gross_price_per_day: 0,
  weight_kg: "", power_consumption_watts: "", condition: "Good" as EquipmentCondition,
  current_location: "Warehouse" as EquipmentLocation, notes: "",
  items_per_case: 1, case_weight_kg: "", case_volume_m3: "",
};

export function AddEquipmentDrawer({ open, onOpenChange }: Props) {
  const createEquipment = useCreateEquipment();
  const [form, setForm] = useState(initialForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEquipment.mutateAsync({
        name: form.name, category: form.category, subcategory: form.subcategory || null,
        brand: form.brand || null, model: form.model || null, serial_number: form.serial_number || null,
        quantity_total: form.quantity_total, quantity_available: form.quantity_available,
        gross_price_per_day: form.gross_price_per_day, weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        power_consumption_watts: form.power_consumption_watts ? Number(form.power_consumption_watts) : null,
        condition: form.condition, current_location: form.current_location, notes: form.notes || null,
        items_per_case: form.items_per_case,
        case_weight_kg: form.case_weight_kg ? Number(form.case_weight_kg) : null,
        case_volume_m3: form.case_volume_m3 ? Number(form.case_volume_m3) : null,
        qty_in_warehouse: form.quantity_available,
      });
      toast.success("Ekipman başarıyla eklendi");
      onOpenChange(false);
      setForm(initialForm);
    } catch (err: any) {
      toast.error(err.message || "Ekipman eklenemedi");
    }
  };

  const update = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground tracking-display">Ekipman Ekle</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ad *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Martin MAC Aura XB" required className="bg-input border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Kategori *</Label>
              <Select value={form.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Alt Kategori</Label>
              <Input value={form.subcategory} onChange={(e) => update("subcategory", e.target.value)} placeholder="Moving Head" className="bg-input border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Marka</Label>
              <Input value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="Martin" className="bg-input border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Model</Label>
              <Input value={form.model} onChange={(e) => update("model", e.target.value)} placeholder="MAC Aura XB" className="bg-input border-border" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Seri Numarası</Label>
            <Input value={form.serial_number} onChange={(e) => update("serial_number", e.target.value)} placeholder="Benzersiz seri no (opsiyonel)" className="bg-input border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Toplam Adet *</Label>
              <Input type="number" min={1} value={form.quantity_total} onChange={(e) => { const v = Number(e.target.value); update("quantity_total", v); if (form.quantity_available > v) update("quantity_available", v); }} className="bg-input border-border tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Müsait</Label>
              <Input type="number" min={0} max={form.quantity_total} value={form.quantity_available} onChange={(e) => update("quantity_available", Number(e.target.value))} className="bg-input border-border tabular-nums" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Günlük Brüt Fiyat (₺) *</Label>
            <Input type="number" min={0} step="0.01" value={form.gross_price_per_day} onChange={(e) => update("gross_price_per_day", Number(e.target.value))} className="bg-input border-border tabular-nums" />
          </div>

          {/* Case Bilgileri */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Case Bilgileri</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Adet/Case</Label>
                <Input type="number" min={1} value={form.items_per_case} onChange={(e) => update("items_per_case", Math.max(1, Number(e.target.value)))} className="bg-input border-border tabular-nums" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Case Ağırlık (kg)</Label>
                <Input type="number" step="0.1" min={0} value={form.case_weight_kg} onChange={(e) => update("case_weight_kg", e.target.value)} placeholder="90" className="bg-input border-border tabular-nums" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Case Hacim (m³)</Label>
                <Input type="number" step="0.01" min={0} value={form.case_volume_m3} onChange={(e) => update("case_volume_m3", e.target.value)} placeholder="0.8" className="bg-input border-border tabular-nums" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ağırlık (kg)</Label>
              <Input type="number" step="0.1" value={form.weight_kg} onChange={(e) => update("weight_kg", e.target.value)} className="bg-input border-border tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Güç (W)</Label>
              <Input type="number" value={form.power_consumption_watts} onChange={(e) => update("power_consumption_watts", e.target.value)} className="bg-input border-border tabular-nums" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Durum</Label>
              <Select value={form.condition} onValueChange={(v) => update("condition", v)}>
                <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{conditions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Konum</Label>
              <Select value={form.current_location} onValueChange={(v) => update("current_location", v)}>
                <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notlar</Label>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Ek notlar..." className="bg-input border-border resize-none" rows={3} />
          </div>
          <Button type="submit" className="w-full" disabled={createEquipment.isPending}>
            {createEquipment.isPending ? "Ekleniyor..." : "Ekipman Ekle"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
