import { Badge } from "@/components/ui/badge";
import type { EventStatus } from "@/hooks/useEvents";

const statusStyles: Record<EventStatus, string> = {
  Planning: "bg-muted text-muted-foreground border-border",
  Confirmed: "bg-primary/15 text-primary border-primary/20",
  "In Progress": "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20",
  Completed: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/20",
  Cancelled: "bg-destructive/15 text-destructive border-destructive/20",
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <Badge variant="outline" className={statusStyles[status]}>
      {status}
    </Badge>
  );
}
