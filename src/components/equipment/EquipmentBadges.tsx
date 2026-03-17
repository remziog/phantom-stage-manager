import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type EquipmentLocation = Database["public"]["Enums"]["equipment_location"];
type EquipmentCondition = Database["public"]["Enums"]["equipment_condition"];
type EquipmentCategory = Database["public"]["Enums"]["equipment_category"];

const locationStyles: Record<EquipmentLocation, string> = {
  "Warehouse": "bg-success/15 text-success border-success/20",
  "On Event": "bg-primary/15 text-primary border-primary/20",
  "In Transit": "bg-warning/15 text-warning border-warning/20",
  "Under Maintenance": "bg-destructive/15 text-destructive border-destructive/20",
};

const conditionStyles: Record<EquipmentCondition, string> = {
  "Excellent": "bg-success/15 text-success border-success/20",
  "Good": "bg-primary/15 text-primary border-primary/20",
  "Fair": "bg-warning/15 text-warning border-warning/20",
  "Needs Repair": "bg-destructive/15 text-destructive border-destructive/20",
};

const categoryStyles: Record<EquipmentCategory, string> = {
  "Light": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "Sound": "bg-violet-500/15 text-violet-400 border-violet-500/20",
  "Video/Image": "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  "Truss": "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "Rigging": "bg-rose-500/15 text-rose-400 border-rose-500/20",
  "Power/Cable": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "Other": "bg-slate-500/15 text-slate-400 border-slate-500/20",
};

export function LocationBadge({ location }: { location: EquipmentLocation }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] uppercase tracking-widest font-semibold rounded px-2 py-0.5", locationStyles[location])}>
      {location}
    </Badge>
  );
}

export function ConditionBadge({ condition }: { condition: EquipmentCondition }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] uppercase tracking-widest font-semibold rounded px-2 py-0.5", conditionStyles[condition])}>
      {condition}
    </Badge>
  );
}

export function CategoryBadge({ category }: { category: EquipmentCategory }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] uppercase tracking-widest font-semibold rounded px-2 py-0.5", categoryStyles[category])}>
      {category}
    </Badge>
  );
}

export function AvailabilityDisplay({ available, total }: { available: number; total: number }) {
  const ratio = total > 0 ? available / total : 0;
  const barColor = ratio > 0.5 ? "bg-success" : ratio > 0.2 ? "bg-warning" : "bg-destructive";

  return (
    <div className="space-y-1">
      <span className="text-sm tabular-nums text-foreground">
        {available} <span className="text-muted-foreground">/ {total}</span>
      </span>
      <div className="h-1 w-16 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

/** Durum dağılımı: Depoda / Kirada / Tamirde / Servis Dışı */
export function StatusDistribution({
  warehouse, onRent, inRepair, outOfService, total,
}: {
  warehouse: number; onRent: number; inRepair: number; outOfService: number; total: number;
}) {
  if (total === 0) return null;
  const items = [
    { label: "Depoda", count: warehouse, cls: "text-success" },
    { label: "Kirada", count: onRent, cls: "text-primary" },
    { label: "Tamirde", count: inRepair, cls: "text-warning" },
    { label: "S.Dışı", count: outOfService, cls: "text-destructive" },
  ].filter((i) => i.count > 0);

  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] tabular-nums">
      <span className="text-muted-foreground">{total} Adet:</span>
      {items.map((i) => (
        <span key={i.label} className={i.cls}>
          {i.count} {i.label}
        </span>
      ))}
    </div>
  );
}

/** Case hesaplama özeti */
export function CaseCalculation({
  quantity, itemsPerCase, caseWeightKg, caseVolumeM3,
}: {
  quantity: number; itemsPerCase: number; caseWeightKg: number | null; caseVolumeM3: number | null;
}) {
  if (!itemsPerCase || itemsPerCase <= 0) return null;
  const cases = Math.ceil(quantity / itemsPerCase);
  const totalKg = caseWeightKg ? cases * caseWeightKg : null;
  const totalM3 = caseVolumeM3 ? cases * caseVolumeM3 : null;

  if (!totalKg && !totalM3) return null;

  return (
    <span className="text-[11px] text-muted-foreground tabular-nums">
      {quantity} ad → {cases} case
      {totalKg != null && <> · {totalKg.toLocaleString("tr-TR")} kg</>}
      {totalM3 != null && <> · {totalM3.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} m³</>}
    </span>
  );
}
