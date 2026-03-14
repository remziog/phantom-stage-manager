import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useEquipment } from "@/hooks/useEquipment";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useVehicles } from "@/hooks/useVehicles";
import type { QuoteLineItem, LineItemType } from "@/hooks/useQuotes";
import { Plus, Trash2, Package, User, Truck, Wrench } from "lucide-react";

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

interface Props {
  quoteId: string;
  initialItems: QuoteLineItem[];
  onSave: (items: DraftItem[]) => void;
  saving: boolean;
}

export function LineItemEditor({ quoteId, initialItems, onSave, saving }: Props) {
  const [items, setItems] = useState<DraftItem[]>([]);
  const { data: equipment = [] } = useEquipment();
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: vehicles = [] } = useVehicles();

  useEffect(() => {
    if (initialItems.length > 0) {
      setItems(
        initialItems.map(({ id, created_at, ...rest }) => rest)
      );
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
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, sort_order: i })));
  };

  const addFromEquipment = (eqId: string, index: number) => {
    const eq = equipment.find((e) => e.id === eqId);
    if (eq) {
      updateItem(index, {
        source_id: eqId,
        description: `${eq.name}${eq.brand ? ` (${eq.brand})` : ""}`,
        unit_price: eq.gross_price_per_day,
      });
    }
  };

  const addFromTeam = (tmId: string, index: number) => {
    const tm = teamMembers.find((t) => t.id === tmId);
    if (tm) {
      updateItem(index, {
        source_id: tmId,
        description: `${tm.full_name} — ${tm.role}`,
        unit_price: tm.daily_rate,
      });
    }
  };

  const addFromVehicle = (vId: string, index: number) => {
    const v = vehicles.find((ve) => ve.id === vId);
    if (v) {
      updateItem(index, {
        source_id: vId,
        description: `${v.name} (${v.license_plate})`,
        unit_price: v.daily_cost,
      });
    }
  };

  const subtotal = items.reduce((s, i) => s + i.line_total, 0);
  const fmt = (v: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-4">
      {/* Add buttons */}
      <div className="flex flex-wrap gap-2">
        {(["Equipment", "Personnel", "Vehicle", "Custom"] as LineItemType[]).map((type) => (
          <Button key={type} variant="outline" size="sm" onClick={() => addItem(type)} className="gap-1.5">
            <span className={typeColors[type]}>{typeIcons[type]}</span>
            Add {type}
          </Button>
        ))}
      </div>

      {/* Line items */}
      {items.length === 0 ? (
        <Card className="phantom-shadow border-border/50">
          <CardContent className="flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">No line items yet. Add items from the buttons above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[auto_1fr_80px_60px_100px_100px_32px] gap-2 px-2 text-xs font-medium text-muted-foreground">
            <span className="w-8" />
            <span>Description</span>
            <span>Qty</span>
            <span>Days</span>
            <span>Unit ₺</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          {items.map((item, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-2">
                <div className="grid grid-cols-[auto_1fr_80px_60px_100px_100px_32px] gap-2 items-center">
                  <span className={`w-8 flex justify-center ${typeColors[item.item_type]}`}>
                    {typeIcons[item.item_type]}
                  </span>

                  {/* Description / Source selector */}
                  <div className="min-w-0">
                    {item.item_type === "Equipment" ? (
                      <Select
                        value={item.source_id || ""}
                        onValueChange={(v) => addFromEquipment(v, i)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select equipment">{item.description || "Select equipment"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {equipment.map((eq) => (
                            <SelectItem key={eq.id} value={eq.id}>
                              {eq.name} — {fmt(eq.gross_price_per_day)}/day
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : item.item_type === "Personnel" ? (
                      <Select
                        value={item.source_id || ""}
                        onValueChange={(v) => addFromTeam(v, i)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select crew">{item.description || "Select crew"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map((tm) => (
                            <SelectItem key={tm.id} value={tm.id}>
                              {tm.full_name} — {tm.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : item.item_type === "Vehicle" ? (
                      <Select
                        value={item.source_id || ""}
                        onValueChange={(v) => addFromVehicle(v, i)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select vehicle">{item.description || "Select vehicle"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name} — {fmt(v.daily_cost)}/day
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="h-8 text-xs"
                        placeholder="Custom item description"
                        value={item.description}
                        maxLength={300}
                        onChange={(e) => updateItem(i, { description: e.target.value })}
                      />
                    )}
                  </div>

                  <Input
                    type="number"
                    min={1}
                    max={999}
                    className="h-8 text-xs"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  />
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    className="h-8 text-xs"
                    value={item.days}
                    onChange={(e) => updateItem(i, { days: Math.max(1, parseInt(e.target.value) || 1) })}
                  />
                  <Input
                    type="number"
                    min={0}
                    className="h-8 text-xs"
                    value={item.unit_price}
                    onChange={(e) => updateItem(i, { unit_price: Math.max(0, parseFloat(e.target.value) || 0) })}
                  />
                  <div className="text-right text-sm font-medium text-foreground tabular-nums">
                    {fmt(item.line_total)}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Subtotal */}
          <div className="flex justify-end pr-12 pt-2">
            <div className="text-sm text-muted-foreground">
              Subtotal: <span className="font-semibold text-foreground">{fmt(subtotal)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={() => onSave(items)} disabled={saving}>
          {saving ? "Saving…" : "Save Line Items"}
        </Button>
      </div>
    </div>
  );
}
