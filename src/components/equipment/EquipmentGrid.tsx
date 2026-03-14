import type { Equipment } from "@/hooks/useEquipment";
import {
  LocationBadge,
  CategoryBadge,
  AvailabilityDisplay,
} from "./EquipmentBadges";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount);

export function EquipmentGrid({ data }: { data: Equipment[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {data.map((item) => (
        <div
          key={item.id}
          className="rounded-lg bg-card p-4 phantom-shadow hover:bg-surface-hover transition-colors duration-200 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-medium text-foreground truncate">{item.name}</h3>
              {item.subcategory && (
                <p className="text-xs text-muted-foreground">{item.subcategory}</p>
              )}
            </div>
            <LocationBadge location={item.current_location} />
          </div>

          <div className="flex items-center gap-2">
            <CategoryBadge category={item.category} />
          </div>

          {(item.brand || item.model) && (
            <p className="text-xs text-muted-foreground">
              {[item.brand, item.model].filter(Boolean).join(" ")}
            </p>
          )}

          <div className="flex items-end justify-between">
            <AvailabilityDisplay available={item.quantity_available} total={item.quantity_total} />
            <span className="text-sm font-medium tabular-nums text-foreground">
              {formatCurrency(item.gross_price_per_day)}
              <span className="text-xs text-muted-foreground">/day</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
