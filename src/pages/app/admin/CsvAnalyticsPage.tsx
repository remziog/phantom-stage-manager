import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  Pencil, Undo2, Redo2, RefreshCcw, AlertCircle, BarChart3, Activity,
} from "lucide-react";
import {
  fetchCsvActionTotals,
  fetchCsvFieldStats,
  fetchCsvRecentEvents,
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

export default function CsvAnalyticsPage() {
  const { user, company } = useAuth();
  const cid = company?.id ?? "";
  const uid = user?.id ?? "";
  const [rangeDays, setRangeDays] = useState<number>(30);

  // Membership role gate. RLS will already deny SELECTs to non-admins —
  // this fetch lets us show a clear access-denied panel rather than an
  // empty dashboard.
  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["company-role", cid, uid],
    queryFn: () => fetchCurrentMemberRole(cid, uid),
    enabled: !!cid && !!uid,
  });
  const isAdmin = role === "owner" || role === "admin";

  const totalsQ = useQuery({
    queryKey: ["csv-analytics", "totals", cid, rangeDays],
    queryFn: () => fetchCsvActionTotals(cid, rangeDays),
    enabled: !!cid && isAdmin,
  });
  const fieldsQ = useQuery({
    queryKey: ["csv-analytics", "fields", cid, rangeDays],
    queryFn: () => fetchCsvFieldStats(cid, rangeDays, 10),
    enabled: !!cid && isAdmin,
  });
  const recentQ = useQuery({
    queryKey: ["csv-analytics", "recent", cid],
    queryFn: () => fetchCsvRecentEvents(cid, 25),
    enabled: !!cid && isAdmin,
  });

  const refetchAll = () => {
    void totalsQ.refetch();
    void fieldsQ.refetch();
    void recentQ.refetch();
  };

  const totals = totalsQ.data;
  const undoRedoRatio = useMemo(() => {
    if (!totals || totals.edit === 0) return null;
    const undoLike = totals.undo + totals.undo_row + totals.undo_all;
    return ((undoLike / totals.edit) * 100).toFixed(1);
  }, [totals]);

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
              Ask an administrator to share access if you need these metrics.
            </CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  const kpis = [
    { label: "Edits",     value: totals?.edit ?? 0,     icon: Pencil,    tone: "text-primary" as const },
    { label: "Undos",     value: totals?.undo ?? 0,     icon: Undo2,     tone: "text-primary" as const },
    { label: "Redos",     value: totals?.redo ?? 0,     icon: Redo2,     tone: "text-primary" as const },
    { label: "Bulk reverts", value: (totals?.undo_row ?? 0) + (totals?.undo_all ?? 0), icon: RefreshCcw, tone: "text-primary" as const },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-display flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              CSV import analytics
            </h1>
            <p className="text-sm text-muted-foreground">
              How often your team is editing, undoing, and redoing CSV imports for {company?.name}.
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
            <Button variant="outline" size="sm" onClick={refetchAll}>
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
                  {totalsQ.isLoading ? "—" : k.value.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Undo/Edit ratio summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity summary</CardTitle>
            <CardDescription>
              {totalsQ.isLoading
                ? "Loading totals…"
                : totals && totals.total > 0
                  ? <>
                      Captured <span className="font-medium text-foreground tabular-nums">{totals.total.toLocaleString()}</span> events
                      in the last {rangeDays} days.
                      {undoRedoRatio !== null && (
                        <> Undo activity (incl. row / all) is{" "}
                          <span className="font-medium text-foreground tabular-nums">{undoRedoRatio}%</span> of edits —
                          higher means users revisit more changes.
                        </>
                      )}
                    </>
                  : "No CSV editor activity in this window yet."}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Top fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most edited CSV fields</CardTitle>
            <CardDescription>
              Top columns by edit + undo + redo activity. Click a field for the full timeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead className="text-right">Edits</TableHead>
                  <TableHead className="text-right">Undos</TableHead>
                  <TableHead className="text-right">Redos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fieldsQ.isLoading && (
                  <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                )}
                {!fieldsQ.isLoading && (fieldsQ.data?.length ?? 0) === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No field-level events recorded yet.</TableCell></TableRow>
                )}
                {fieldsQ.data?.map((f) => {
                  const total = f.edits + f.undos + f.redos;
                  return (
                    <TableRow key={f.field} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <Link
                          to={`/app/admin/csv-analytics/field/${encodeURIComponent(f.field)}`}
                          className="block hover:underline text-primary"
                        >
                          {f.field}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{f.edits.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{f.undos.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{f.redos.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{total.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Recent activity
            </CardTitle>
            <CardDescription>Last 25 events across all members.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead className="text-right">Row</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentQ.isLoading && (
                  <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                )}
                {!recentQ.isLoading && (recentQ.data?.length ?? 0) === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No events yet.</TableCell></TableRow>
                )}
                {recentQ.data?.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground tabular-nums">{formatRelative(e.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ACTION_LABEL[e.action] ?? e.action}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{e.field ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {e.line_number ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
