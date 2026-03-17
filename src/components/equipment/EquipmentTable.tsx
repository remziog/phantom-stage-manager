import type { Equipment } from "@/hooks/useEquipment";
import { LocationBadge, ConditionBadge, CategoryBadge, AvailabilityDisplay } from "./EquipmentBadges";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount);

export function EquipmentTable({ data }: { data: Equipment[] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden phantom-shadow">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Ad</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Kategori</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Marka / Model</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Fiyat/Gün</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Müsait</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Durum</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Konum</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={item.id}
                className="border-b border-border last:border-0 hover:bg-[rgba(255,255,255,0.03)] transition-colors duration-200"
                style={index % 2 === 1 ? { backgroundColor: "rgba(255,255,255,0.02)" } : {}}
              >
                <td className="px-4 py-3">
                  <div>
                    <span className="font-medium text-foreground">{item.name}</span>
                    {item.subcategory && <span className="block text-xs text-muted-foreground">{item.subcategory}</span>}
                  </div>
                </td>
                <td className="px-4 py-3"><CategoryBadge category={item.category} /></td>
                <td className="px-4 py-3 text-muted-foreground">{[item.brand, item.model].filter(Boolean).join(" ") || "—"}</td>
                <td className="px-4 py-3 tabular-nums text-foreground">{formatCurrency(item.gross_price_per_day)}</td>
                <td className="px-4 py-3"><AvailabilityDisplay available={item.quantity_available} total={item.quantity_total} /></td>
                <td className="px-4 py-3"><ConditionBadge condition={item.condition} /></td>
                <td className="px-4 py-3"><LocationBadge location={item.current_location} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}