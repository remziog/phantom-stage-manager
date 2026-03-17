import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useEquipment } from "@/hooks/useEquipment";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useVehicles } from "@/hooks/useVehicles";
import { useCustomerPrices } from "@/hooks/useCustomerPrices";
import type { QuoteLineItem, LineItemType } from "@/hooks/useQuotes";
import { Plus, Trash2, Package, User, Truck, Wrench, ChevronDown, ChevronRight, Weight, Box } from "lucide-react";

type DraftItem = Omit<QuoteLineItem, "id" | "created_at">;

const typeIcons: Record<LineItemType, React.ReactNode> = {
  Equipment: <Package className="h-4 w-4" />,
  Personnel: <User className="h-4 w-4" />,
  Vehicle: <Truck className="h-4 w-4" />,
  Custom: <Wrench className="h-4 w-4" />,
};

const typeColors: Record<LineItemType, string> = {
  Equipment: "text-primary",
  Personnel: "text-[hsl(var(--success))]",
  Vehicle: "text-[hsl(var(--warning))]",
  Custom: "text-muted-foreground",
};

const typeLabels: Record<LineItemType, string> = {
  Equipment: "Ekipman",
  Personnel: "Personel",
  Vehicle: "Araç",
  Custom: "Özel",
};

interface Props {
  quoteId: string;
  customerId?: string | null;
  initialItems: QuoteLineItem[];
  onSave: (items: DraftItem[]) => void;
  saving: boolean;
}

export function LineItemEditor({ quoteId, customerId, initialItems, onSave, saving }: Props) {
  const [items, setItems] = useState<DraftItem[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Equipment: true, Personnel: true, Vehicle: true, Custom: true,
  });
  const { data: equipment = [] } = useEquipment();
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: vehicles = [] } = useVehicles();
  const { data: customerPrices = [] } = useCustomerPrices(customerId || undefined);

  // Build customer price map: equipment_id → custom_price_per_day
  const customerPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    const today = new Date().toISOString().slice(0, 10);
    customerPrices.forEach((cp) => {
      if (cp.valid_from <= today && (!cp.valid_until || cp.valid_until >= today)) {
        map.set(cp.equipment_id, cp.custom_price_per_day);
      }
    });
    return map;
  }, [customerPrices]);

  useEffect(() => {
    if (initialItems.length > 0) {
      setItems(initialItems.map(({ id, created_at, ...rest }) => rest));
    }
  }, [initialItems]);

  const recalcLine = (item: DraftItem): DraftItem => ({
    ...item,
    line_total: item.quantity * item.days * item.unit_price,
  });

  const updateItem = useCallback((index: number, updates: Partial<DraftItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = recalcLine({ ...copy[index], ...updates });
      return copy;
    });
  }, []);

  const addItem = (type: LineItemType) => {
    setItems((prev) => [
      ...prev,
      recalcLine({
        quote_id: quoteId,
        item_type: type,
        source_id: null,
        description: "",
        quantity: 1,
        days: 1,
        unit_price: 0,
        line_total: 0,
        sort_order: prev.length,
      }),
    ]);
    setOpenSections((prev) => ({ ...prev, [type]: true }));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, sort_order: i })));
  };

  const getEquipmentPrice = (eqId: string, grossPrice: number) => {
    return customerPriceMap.get(eqId) ?? grossPrice;
  };

  const addFromEquipment = (eqId: string, index: number) => {
    const eq = equipment.find((e) => e.id === eqId);
    if (eq) {
      const price = getEquipmentPrice(eqId, eq.gross_price_per_day);
      updateItem(index, {
        source_id: eqId,
        description: `${eq.name}${eq.brand ? ` (${eq.brand})` : ""}`,
        unit_price: price,
      });
    }
  };

  const addFromTeam = (tmId: string, index: number) => {
    const tm = teamMembers.find((t) => t.id === tmId);
    if (tm) updateItem(index, { source_id: tmId, description: `${tm.full_name} — ${tm.role}`, unit_price: tm.daily_rate });
  };

  const addFromVehicle = (vId: string, index: number) => {
    const v = vehicles.find((ve) => ve.id === vId);
    if (v) updateItem(index, { source_id: vId, description: `${v.name} (${v.license_plate})`, unit_price: v.daily_cost });
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v);

  // Group items by type
  const grouped = useMemo(() => {
    const groups: Record<LineItemType, { item: DraftItem; originalIndex: number }[]> = {
      Equipment: [], Personnel: [], Vehicle: [], Custom: [],
    };
    items.forEach((item, i) => {
      groups[item.item_type].push({ item, originalIndex: i });
    });
    return groups;
  }, [items]);

  // Calculate weight & volume for equipment items
  const weightVolume = useMemo(() => {
    let totalWeight = 0;
    let totalVolume = 0;
    let totalCaseWeight = 0;
    items.forEach((item) => {
      if (item.item_type === "Equipment" && item.source_id) {
        const eq = equipment.find((e) => e.id === item.source_id);
        if (eq) {
          totalWeight += (eq.weight_kg || 0) * item.quantity;
          const casesNeeded = eq.items_per_case ? Math.ceil(item.quantity / eq.items_per_case) : item.quantity;
          totalCaseWeight += (eq.case_weight_kg || 0) * casesNeeded;
          totalVolume += (eq.case_volume_m3 || 0) * casesNeeded;
        }
      }
    });
    return { totalWeight, totalCaseWeight, totalVolume, grandWeight: totalWeight + totalCaseWeight };
  }, [items, equipment]);

  const subtotal = items.reduce((s, i) => s + i.line_total, 0);
  const groupSubtotals = useMemo(() => {
    const result: Record<LineItemType, number> = { Equipment: 0, Personnel: 0, Vehicle: 0, Custom: 0 };
    items.forEach((item) => { result[item.item_type] += item.line_total; });
    return result;
  }, [items]);

  const toggleSection = (type: string) => {
    setOpenSections((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const renderItemRow = (item: DraftItem, originalIndex: number) => (
    <div key={originalIndex} className="grid grid-cols-[1fr_80px_60px_100px_100px_32px] gap-2 items-center p-2">
      <div className="min-w-0">
        {item.item_type === "Equipment" ? (
          <Select value={item.source_id || ""} onValueChange={(v) => addFromEquipment(v, originalIndex)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Ekipman seçin">{item.description || "Ekipman seçin"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {equipment.map((eq) => {
                const price = getEquipmentPrice(eq.id, eq.gross_price_per_day);
                const hasCustom = customerPriceMap.has(eq.id);
                return (
                  <SelectItem key={eq.id} value={eq.id}>
                    {eq.name} — {fmt(price)}/gün
                    {hasCustom && " ★"}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        ) : item.item_type === "Personnel" ? (
          <Select value={item.source_id || ""} onValueChange={(v) => addFromTeam(v, originalIndex)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Ekip seçin">{item.description || "Ekip seçin"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map((tm) => (
                <SelectItem key={tm.id} value={tm.id}>{tm.full_name} — {tm.role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : item.item_type === "Vehicle" ? (
          <Select value={item.source_id || ""} onValueChange={(v) => addFromVehicle(v, originalIndex)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Araç seçin">{item.description || "Araç seçin"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name} — {fmt(v.daily_cost)}/gün</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            className="h-8 text-xs"
            placeholder="Özel kalem açıklaması"
            value={item.description}
            maxLength={300}
            onChange={(e) => updateItem(originalIndex, { description: e.target.value })}
          />
        )}
      </div>
      <Input type="number" min={1} max={999} className="h-8 text-xs" value={item.quantity} onChange={(e) => updateItem(originalIndex, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} />
      <Input type="number" min={1} max={365} className="h-8 text-xs" value={item.days} onChange={(e) => updateItem(originalIndex, { days: Math.max(1, parseInt(e.target.value) || 1) })} />
      <Input type="number" min={0} className="h-8 text-xs" value={item.unit_price} onChange={(e) => updateItem(originalIndex, { unit_price: Math.max(0, parseFloat(e.target.value) || 0) })} />
      <div className="text-right text-sm font-medium text-foreground tabular-nums">{fmt(item.line_total)}</div>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(originalIndex)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  const departmentOrder: LineItemType[] = ["Equipment", "Personnel", "Vehicle", "Custom"];

  return (
    <div className="space-y-4">
      {/* Add buttons */}
      <div className="flex flex-wrap gap-2">
        {departmentOrder.map((type) => (
          <Button key={type} variant="outline" size="sm" onClick={() => addItem(type)} className="gap-1.5">
            <span className={typeColors[type]}>{typeIcons[type]}</span>
            {typeLabels[type]} Ekle
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <Card className="phantom-shadow border-border/50">
          <CardContent className="flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">Henüz kalem yok. Yukarıdaki butonlardan ekleyin.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {departmentOrder.map((type) => {
            const group = grouped[type];
            if (group.length === 0) return null;
            const isOpen = openSections[type];
            return (
              <Collapsible key={type} open={isOpen} onOpenChange={() => toggleSection(type)}>
                <Card className="border-border/50">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <span className={typeColors[type]}>{typeIcons[type]}</span>
                          <CardTitle className="text-sm font-medium">{typeLabels[type]}</CardTitle>
                          <Badge variant="secondary" className="text-xs">{group.length} kalem</Badge>
                        </div>
                        <span className="text-sm font-semibold text-foreground tabular-nums">{fmt(groupSubtotals[type])}</span>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-0 pb-2">
                      <div className="grid grid-cols-[1fr_80px_60px_100px_100px_32px] gap-2 px-4 py-1 text-xs font-medium text-muted-foreground">
                        <span>Açıklama</span>
                        <span>Adet</span>
                        <span>Gün</span>
                        <span>Birim ₺</span>
                        <span className="text-right">Toplam</span>
                        <span />
                      </div>
                      <div className="divide-y divide-border/30 px-2">
                        {group.map(({ item, originalIndex }) => renderItemRow(item, originalIndex))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Weight & Volume Summary */}
      {weightVolume.grandWeight > 0 && (
        <Card className="border-border/50 bg-muted/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Weight className="h-4 w-4" />
                <span>Ekipman: <strong className="text-foreground">{weightVolume.totalWeight.toFixed(1)} kg</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Box className="h-4 w-4" />
                <span>Case: <strong className="text-foreground">{weightVolume.totalCaseWeight.toFixed(1)} kg</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span>Hacim: <strong className="text-foreground">{weightVolume.totalVolume.toFixed(2)} m³</strong></span>
              </div>
              <div className="ml-auto text-muted-foreground">
                Toplam Ağırlık: <strong className="text-foreground">{weightVolume.grandWeight.toFixed(1)} kg</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grand subtotal */}
      {items.length > 0 && (
        <div className="flex justify-end pr-2 pt-1">
          <div className="text-sm text-muted-foreground">
            Ara Toplam: <span className="font-semibold text-foreground">{fmt(subtotal)}</span>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => onSave(items)} disabled={saving}>
          {saving ? "Kaydediliyor…" : "Kalemleri Kaydet"}
        </Button>
      </div>
    </div>
  );
}
