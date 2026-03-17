import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { Activity, FileText, Calendar, Package, Users, Truck } from "lucide-react";

const entityIcons: Record<string, React.ElementType> = {
  quote: FileText,
  event: Calendar,
  equipment: Package,
  team_member: Users,
  vehicle: Truck,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins}dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}sa önce`;
  const days = Math.floor(hrs / 24);
  return `${days}g önce`;
}

export function RecentActivity() {
  const { data: logs = [], isLoading } = useActivityLogs(10);

  if (isLoading || logs.length === 0) return null;

  return (
    <Card className="phantom-shadow border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4 text-accent" /> Son Aktiviteler
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-64 overflow-auto">
        {logs.map((log) => {
          const Icon = entityIcons[log.entity_type] || Activity;
          return (
            <div key={log.id} className="flex items-start gap-2 rounded-md bg-secondary/50 px-3 py-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{log.action}</span>
                  {log.entity_label && (
                    <span className="text-muted-foreground"> — {log.entity_label}</span>
                  )}
                </p>
                {log.details && (
                  <p className="text-xs text-muted-foreground truncate">{log.details}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{timeAgo(log.created_at)}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}