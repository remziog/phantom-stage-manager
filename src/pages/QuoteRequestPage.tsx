import { DashboardLayout } from "@/components/DashboardLayout";
import { QuoteRequestForm } from "@/components/quotes/QuoteRequestForm";
import { useQuoteRequests } from "@/hooks/useQuoteRequests";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle, XCircle } from "lucide-react";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  pending: { label: "Pending Review", variant: "secondary", icon: Clock },
  reviewed: { label: "Reviewed", variant: "default", icon: CheckCircle },
  converted: { label: "Quote Created", variant: "default", icon: FileText },
  declined: { label: "Declined", variant: "destructive", icon: XCircle },
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function QuoteRequestPage() {
  const { data: requests = [], isLoading } = useQuoteRequests();

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-3xl mx-auto">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Request a Quote</h1>
          <p className="text-sm text-muted-foreground">
            Tell us about your event and we'll prepare a custom proposal.
          </p>
        </div>

        <QuoteRequestForm />

        {/* Past Requests */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">My Requests</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : requests.length === 0 ? (
            <Card className="phantom-shadow border-border/50">
              <CardContent className="flex flex-col items-center justify-center p-8">
                <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No requests yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => {
                const config = statusConfig[r.status] || statusConfig.pending;
                const Icon = config.icon;
                return (
                  <Card key={r.id} className="phantom-shadow border-border/50">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="rounded-lg bg-secondary p-2.5 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.event_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.event_type} · {fmtDate(r.start_date)}
                          {r.services_needed.length > 0 && ` · ${r.services_needed.length} services`}
                        </p>
                      </div>
                      <Badge variant={config.variant} className="gap-1 shrink-0">
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
