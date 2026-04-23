import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-display">Reports</h1>
          <p className="text-sm text-muted-foreground">Insights into your operations.</p>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Coming soon</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Detailed reports — utilization trends, revenue by customer, and asset performance — are on the way.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
