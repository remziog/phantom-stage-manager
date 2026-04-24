import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, AlertCircle, Pencil, Undo2, Redo2, RefreshCcw, Activity,
} from "lucide-react";
import {
  fetchCsvFieldSummary,
  fetchCsvFieldTimeline,
  fetchCurrentMemberRole,
} from "@/services/csvAnalyticsAdmin";

const RANGE_OPTIONS = [
  { value: "7",  label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const ACTION_LABEL: Record<string, string> = {
  edit: "Edit",
  undo: "Undo",
  redo: "Redo",
  undo_row: "Undo row",
  undo_all: "Undo all",
};

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  edit: "default",
  undo: "secondary",
  redo: "secondary",
  undo_row: "outline",
  undo_all: "destructive",
};

const formatRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
};

const formatAbsolute = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
};

export default function CsvFieldDetailPage() {
  const { field: fieldParam } = useParams<{ field: string }>();
  const field = decodeURIComponent(fieldParam ?? "");
  const { user, company } = useAuth();
  const cid = company?.id ?? "";
  const uid = user?.id ?? "";
  const [rangeDays, setRangeDays] = useState<number>(30);

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["company-role", cid, uid],
    queryFn: () => fetchCurrentMemberRole(cid, uid),
    enabled: !!cid && !!uid,
  });
  const isAdmin = role === "owner" || role === "admin";

  const summaryQ = useQuery({
    queryKey: ["csv-field", "summary", cid, field, rangeDays],
    queryFn: () => fetchCsvFieldSummary(cid, field, rangeDays),
    enabled: !!cid && isAdmin && !!field,
  });
  const timelineQ = useQuery({
    queryKey: ["csv-field", "timeline", cid, field, rangeDays],
    queryFn: () => fetchCsvFieldTimeline(cid, field, rangeDays, 200),
    enabled: !!cid && isAdmin && !!field,
  });

  const totals = summaryQ.data;
  const undoRedoRatio = useMemo(() => {
    if (!totals || totals.edit === 0) return null;
    const undoLike = totals.undo + totals.undo_row + totals.undo_all;
    return ((undoLike / totals.edit) * 100).toFixed(1);
  }, [totals]);

  // Group timeline by day for nicer scanning.
  const grouped = useMemo(() => {
    const events = timelineQ.data ?? [];
    const map = new Map<string, typeof events>();
    for (const e of events) {
      const day = new Date(e.created_at).toLocaleDateString(undefined, {
        weekday: "short", month: "short", day: "2-digit", year: "numeric",
      });
      const arr = map.get(day) ?? [];
      arr.push(e);
      map.set(day, arr);
    }
    return Array.from(map.entries());
  }, [timelineQ.data]);

  if (!cid) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Select a company to view analytics.</p>
      </AppShell>
    );
  }

  if (roleLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Checking permissions…</p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Admins only
            </CardTitle>
            <CardDescription>
              CSV import analytics are restricted to owners and admins of {company?.name ?? "this company"}.
            </CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  const kpis = [
    { label: "Edits",        value: totals?.edit ?? 0,                                              icon: Pencil,    tone: "text-primary" as const },
    { label: "Undos",        value: totals?.undo ?? 0,                                              icon: Undo2,     tone: "text-primary" as const },
    { label: "Redos",        value: totals?.redo ?? 0,                                              icon: Redo2,     tone: "text-primary" as const },
    { label: "Bulk reverts", value: (totals?.undo_row ?? 0) + (totals?.undo_all ?? 0),              icon: RefreshCcw, tone: "text-primary" as const },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <Button asChild variant="ghost" size="sm" className="-ml-2 h-8">
              <Link to="/app/admin/csv-analytics">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to analytics
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-display flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              <span className="text-muted-foreground font-normal">Field:</span>
              <span className="font-mono">{field || "—"}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Full edit / undo / redo timeline for this CSV column in {company?.name}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v))}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { void summaryQ.refetch(); void timelineQ.refetch(); }}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</span>
                  <k.icon className={`h-4 w-4 ${k.tone}`} />
                </div>
                <div className="mt-2 text-2xl font-semibold tabular-nums">
                  {summaryQ.isLoading ? "—" : k.value.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary line */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Field summary</CardTitle>
            <CardDescription>
              {summaryQ.isLoading
                ? "Loading…"
                : totals && totals.total > 0
                  ? <>
                      Captured <span className="font-medium text-foreground tabular-nums">{totals.total.toLocaleString()}</span> events
                      on <span className="font-mono text-foreground">{field}</span> in the last {rangeDays} days.
                      {undoRedoRatio !== null && (
                        <> Undo activity is{" "}
                          <span className="font-medium text-foreground tabular-nums">{undoRedoRatio}%</span> of edits.
                        </>
                      )}
                    </>
                  : "No activity recorded for this field in the selected window."}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Timeline grouped by day */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event timeline</CardTitle>
            <CardDescription>
              Most recent first, up to 200 events. Includes bulk reverts that touched this field.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {timelineQ.isLoading && (
              <p className="px-6 py-4 text-sm text-muted-foreground">Loading…</p>
            )}
            {!timelineQ.isLoading && grouped.length === 0 && (
              <p className="px-6 py-4 text-sm text-muted-foreground">No events to show.</p>
            )}
            {grouped.map(([day, events]) => (
              <div key={day} className="border-t first:border-t-0">
                <div className="flex items-center justify-between bg-muted/40 px-6 py-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{day}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {events.length} {events.length === 1 ? "event" : "events"}
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Time</TableHead>
                      <TableHead className="w-[140px]">Action</TableHead>
                      <TableHead className="text-right w-[100px]">Row</TableHead>
                      <TableHead>User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-muted-foreground tabular-nums">
                          <div className="flex flex-col">
                            <span className="text-foreground">{formatAbsolute(e.created_at)}</span>
                            <span className="text-xs">{formatRelative(e.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ACTION_VARIANT[e.action] ?? "secondary"}>
                            {ACTION_LABEL[e.action] ?? e.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {e.line_number ?? "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {e.user_id.slice(0, 8)}…
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
