import { Badge } from "@/components/ui/badge";
import type { QuoteStatus } from "@/hooks/useQuotes";

const statusStyles: Record<QuoteStatus, string> = {
  Draft: "bg-muted text-muted-foreground border-border",
  Sent: "bg-primary/15 text-primary border-primary/20",
  Approved: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/20",
  Rejected: "bg-destructive/15 text-destructive border-destructive/20",
  Cancelled: "bg-muted text-muted-foreground border-border",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <Badge variant="outline" className={statusStyles[status]}>
      {status}
    </Badge>
  );
}
