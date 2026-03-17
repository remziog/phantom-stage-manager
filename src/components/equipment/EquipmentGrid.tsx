import type { Equipment } from "@/hooks/useEquipment";
import { LocationBadge, CategoryBadge, AvailabilityDisplay, StatusDistribution, CaseCalculation } from "./EquipmentBadges";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount);

export function EquipmentGrid({ data, hidePrices = false }: { data: Equipment[]; hidePrices?: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {data.map((item) => (
        <div key={item.id} className="rounded-lg bg-card p-4 phantom-shadow hover:bg-surface-hover transition-colors duration-200 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-medium text-foreground truncate">{item.name}</h3>
              {item.subcategory && <p className="text-xs text-muted-foreground">{item.subcategory}</p>}
              {item.qr_code && <p className="text-[10px] text-muted-foreground/60 font-mono">{item.qr_code}</p>}
            </div>
            <LocationBadge location={item.current_location} />
          </div>
          <div className="flex items-center gap-2"><CategoryBadge category={item.category} /></div>
          {(item.brand || item.model) && (
            <p className="text-xs text-muted-foreground">{[item.brand, item.model].filter(Boolean).join(" ")}</p>
          )}

          <StatusDistribution
            warehouse={item.qty_in_warehouse ?? 0}
            onRent={item.qty_on_rent ?? 0}
            inRepair={item.qty_in_repair ?? 0}
            outOfService={item.qty_out_of_service ?? 0}
            total={item.quantity_total}
          />

          <CaseCalculation
            quantity={item.quantity_total}
            itemsPerCase={item.items_per_case ?? 1}
            caseWeightKg={item.case_weight_kg ?? null}
            caseVolumeM3={item.case_volume_m3 ?? null}
          />

          <div className="flex items-end justify-between">
            <AvailabilityDisplay available={item.quantity_available} total={item.quantity_total} />
            {!hidePrices && (
              <span className="text-sm font-medium tabular-nums text-foreground">
                {formatCurrency(item.gross_price_per_day)}
                <span className="text-xs text-muted-foreground">/gün</span>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
