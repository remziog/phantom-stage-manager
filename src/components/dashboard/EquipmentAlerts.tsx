import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Equipment = {
  id: string;
  name: string;
  category: string;
  condition: string;
  quantity_total: number;
  quantity_available: number;
};

export function EquipmentAlerts({ equipment }: { equipment: Equipment[] }) {
  const navigate = useNavigate();

  const needsRepair = equipment.filter((e) => e.condition === "Needs Repair");
  const lowAvailability = equipment.filter((e) => {
    if (e.quantity_total === 0) return false;
    return e.quantity_available / e.quantity_total < 0.2 && e.condition !== "Needs Repair";
  });

  const alerts = [
    ...needsRepair.map((e) => ({ ...e, alertType: "repair" as const })),
    ...lowAvailability.map((e) => ({ ...e, alertType: "low" as const })),
  ];

  if (alerts.length === 0) return null;

  return (
    <Card className="phantom-shadow border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive" /> Equipment Alerts
          <Badge variant="destructive" className="ml-auto text-xs">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-64 overflow-auto">
        {alerts.slice(0, 10).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2 cursor-pointer hover:bg-secondary transition-colors"
            onClick={() => navigate("/equipment")}
          >
            <div className="min-w-0 flex items-center gap-2">
              {item.alertType === "repair" ? (
                <Wrench className="h-3.5 w-3.5 text-destructive shrink-0" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--warning))] shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.category}</p>
              </div>
            </div>
            <Badge
              variant={item.alertType === "repair" ? "destructive" : "outline"}
              className="text-xs shrink-0"
            >
              {item.alertType === "repair"
                ? "Needs Repair"
                : `${item.quantity_available}/${item.quantity_total}`}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
