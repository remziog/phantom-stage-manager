/**
 * Admin Review — Customer Update Requests.
 * Lists requests grouped by status with a side-by-side diff (current vs.
 * requested) and approve/reject actions. Approval writes the requested
 * values to the customer record; reject just records the decision.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  listUpdateRequests,
  approveRequest,
  rejectRequest,
  fetchCustomerForDiff,
  EDITABLE_FIELDS,
  type EditableField,
  type UpdateRequestStatus,
  type UpdateRequestWithCustomer,
} from "@/services/updateRequestsAdmin";
import {
  Clock, CheckCircle2, XCircle, UserCircle2, Eye, Check, X, Search, ArrowUpDown, Filter, Download,
} from "lucide-react";
import { rowsToCsv, type CsvRow } from "@/lib/csv";

type SortKey = "date_desc" | "date_asc" | "name_asc" | "name_desc" | "email_asc" | "email_desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "name_asc", label: "Company A → Z" },
  { value: "name_desc", label: "Company Z → A" },
  { value: "email_asc", label: "Email A → Z" },
  { value: "email_desc", label: "Email Z → A" },
];

const FIELD_LABELS: Record<EditableField, string> = {
  name: "Company name",
  email: "Email",
  phone: "Phone",
  address: "Address",
  tax_id: "Tax ID",
  notes: "Notes",
};

const STATUS_META: Record<UpdateRequestStatus, { label: string; tone: string; icon: typeof Clock }> = {
  pending: { label: "Pending", tone: "bg-warning/15 text-warning", icon: Clock },
  approved: { label: "Approved", tone: "bg-success/15 text-success", icon: CheckCircle2 },
  rejected: { label: "Rejected", tone: "bg-destructive/15 text-destructive", icon: XCircle },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

/** Returns the list of fields that have a requested value (= a change). */
function changedFields(req: UpdateRequestWithCustomer): EditableField[] {
  return EDITABLE_FIELDS.filter((f) => req[f] !== null && req[f] !== undefined);
}

interface RequestRowProps {
  request: UpdateRequestWithCustomer;
  onReview: (req: UpdateRequestWithCustomer) => void;
  /** When defined, the row shows a checkbox bound to this state. */
  selected?: boolean;
  onSelectedChange?: (next: boolean) => void;
  disabled?: boolean;
}

function RequestRow({
  request, onReview, selected, onSelectedChange, disabled,
}: RequestRowProps) {
  const meta = STATUS_META[request.status];
  const Icon = meta.icon;
  const fields = changedFields(request);
  const selectable = onSelectedChange !== undefined;

  return (
    <li className={`rounded-md border p-4 space-y-3 transition-colors ${
      selected ? "border-primary bg-primary/5" : "border-border"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {selectable && (
            <Checkbox
              checked={!!selected}
              disabled={disabled}
              onCheckedChange={(v) => onSelectedChange?.(v === true)}
              aria-label={`Select request from ${request.customer?.name ?? "customer"}`}
              className="shrink-0"
            />
          )}
          <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <UserCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{request.customer?.name ?? "—"}</div>
            <div className="text-xs text-muted-foreground truncate">
              {request.customer?.email ?? "no email"}
            </div>
          </div>
        </div>
        <div className="text-right space-y-1 shrink-0">
          <Badge className={`${meta.tone} gap-1`}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
          <div className="text-xs text-muted-foreground">{fmtDate(request.created_at)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {fields.length === 0 ? (
          <span className="text-xs text-muted-foreground">No fields changed</span>
        ) : fields.map((f) => (
          <Badge key={f} variant="outline" className="text-xs">{FIELD_LABELS[f]}</Badge>
        ))}
      </div>

      {request.message && (
        <p className="text-sm text-muted-foreground italic">"{request.message}"</p>
      )}

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => onReview(request)}>
          <Eye className="h-4 w-4 mr-2" />
          {request.status === "pending" ? "Review" : "View"}
        </Button>
      </div>
    </li>
  );
}

interface ReviewDialogProps {
  request: UpdateRequestWithCustomer | null;
  onClose: () => void;
}

function ReviewDialog({ request, onClose }: ReviewDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reviewNotes, setReviewNotes] = useState("");

  // Fetch the customer's *current* values so we can show a real diff
  // even if the customer record has changed since the request was made.
  const { data: customerNow } = useQuery({
    queryKey: ["review-customer", request?.customer_id ?? ""],
    queryFn: () => fetchCustomerForDiff(request!.customer_id),
    enabled: !!request,
  });

  const approveMut = useMutation({
    mutationFn: () => approveRequest(request!, user!.id, reviewNotes),
    onSuccess: () => {
      toast({ title: "Request approved", description: "Customer record updated." });
      qc.invalidateQueries({ queryKey: ["update-requests"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      onClose();
      setReviewNotes("");
    },
    onError: (e: Error) =>
      toast({ title: "Could not approve", description: e.message, variant: "destructive" }),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectRequest(request!.id, user!.id, reviewNotes),
    onSuccess: () => {
      toast({ title: "Request rejected" });
      qc.invalidateQueries({ queryKey: ["update-requests"] });
      onClose();
      setReviewNotes("");
    },
    onError: (e: Error) =>
      toast({ title: "Could not reject", description: e.message, variant: "destructive" }),
  });

  if (!request) return null;
  const fields = changedFields(request);
  const isPending = request.status === "pending";
  const busy = approveMut.isPending || rejectMut.isPending;

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review update request</DialogTitle>
          <DialogDescription>
            From {request.customer?.name ?? "—"} · submitted {fmtDate(request.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Customer message */}
          {request.message && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Customer message
              </div>
              <p className="text-sm italic">"{request.message}"</p>
            </div>
          )}

          {/* Diff */}
          <div>
            <div className="text-sm font-medium mb-2">Requested changes</div>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fields changed.</p>
            ) : (
              <div className="space-y-2">
                {fields.map((f) => {
                  const before = (customerNow?.[f] as string | null) ?? "";
                  const after = (request[f] as string | null) ?? "";
                  const same = before === after;
                  return (
                    <div key={f} className="rounded-md border border-border p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                        {FIELD_LABELS[f]}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="rounded bg-destructive/10 border border-destructive/20 p-2">
                          <div className="text-[10px] uppercase tracking-wide text-destructive mb-1">
                            Current
                          </div>
                          <div className="text-foreground break-words whitespace-pre-wrap">
                            {before || <span className="text-muted-foreground">—</span>}
                          </div>
                        </div>
                        <div className={`rounded p-2 border ${
                          same
                            ? "bg-muted/30 border-border"
                            : "bg-success/10 border-success/20"
                        }`}>
                          <div className={`text-[10px] uppercase tracking-wide mb-1 ${
                            same ? "text-muted-foreground" : "text-success"
                          }`}>
                            {same ? "Requested (no change)" : "Requested"}
                          </div>
                          <div className="text-foreground break-words whitespace-pre-wrap">
                            {after || <span className="text-muted-foreground">—</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Existing review notes (read-only when already decided) */}
          {!isPending && request.review_notes && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Admin note
              </div>
              <p className="text-sm">{request.review_notes}</p>
            </div>
          )}

          {/* Notes input — only when actionable */}
          {isPending && (
            <div className="space-y-1.5">
              <Label htmlFor="reviewNotes">Note to customer (optional)</Label>
              <Textarea
                id="reviewNotes"
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Reason or follow-up instructions…"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Close</Button>
          {isPending && (
            <>
              <Button
                variant="destructive"
                onClick={() => rejectMut.mutate()}
                disabled={busy}
              >
                <X className="h-4 w-4 mr-2" />
                {rejectMut.isPending ? "Rejecting…" : "Reject"}
              </Button>
              <Button
                onClick={() => approveMut.mutate()}
                disabled={busy || fields.length === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                {approveMut.isPending ? "Approving…" : "Approve"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type StatusFilter = UpdateRequestStatus | "all";

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminUpdateRequestsPage() {
  const { company, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const cid = company?.id ?? "";
  const [reviewing, setReviewing] = useState<UpdateRequestWithCustomer | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date_desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  // Selected request IDs across the whole inbox (only pending IDs are kept).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Confirm dialog for the bulk action; null = closed.
  const [bulkConfirm, setBulkConfirm] = useState<"approve" | "reject" | null>(null);
  // Statuses to include when exporting the filtered list. Defaults to whatever
  // the user is currently viewing — pending alone, or all three for "all".
  const [exportStatuses, setExportStatuses] = useState<Set<UpdateRequestStatus>>(
    () => new Set<UpdateRequestStatus>(["pending"]),
  );
  const [exportOpen, setExportOpen] = useState(false);

  // Fetch all requests once; filter/sort happens client-side so the status
  // dropdown stays instant and the counts always reflect the same dataset.
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["update-requests", cid, "all"],
    queryFn: () => listUpdateRequests(cid),
    enabled: !!cid,
  });

  const counts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    }),
    [requests],
  );

  // Status → search → sort. Memoised so typing stays cheap.
  const visibleRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const name = (r.customer?.name ?? "").toLowerCase();
      const email = (r.customer?.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case "date_asc":
          return a.created_at.localeCompare(b.created_at);
        case "date_desc":
          return b.created_at.localeCompare(a.created_at);
        case "name_asc":
          return (a.customer?.name ?? "").localeCompare(b.customer?.name ?? "");
        case "name_desc":
          return (b.customer?.name ?? "").localeCompare(a.customer?.name ?? "");
        case "email_asc":
          return (a.customer?.email ?? "").localeCompare(b.customer?.email ?? "");
        case "email_desc":
          return (b.customer?.email ?? "").localeCompare(a.customer?.email ?? "");
        default:
          return 0;
      }
    });
    return sorted;
  }, [requests, search, sort, statusFilter]);

  const statusLabel =
    STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label.toLowerCase() ?? "";

  // Only pending rows in the *current* view are eligible for bulk actions.
  const visiblePending = useMemo(
    () => visibleRequests.filter((r) => r.status === "pending"),
    [visibleRequests],
  );
  const visiblePendingIds = useMemo(
    () => visiblePending.map((r) => r.id),
    [visiblePending],
  );
  const selectedRequests = useMemo(
    () => visiblePending.filter((r) => selected.has(r.id)),
    [visiblePending, selected],
  );
  const allVisibleSelected =
    visiblePendingIds.length > 0 &&
    visiblePendingIds.every((id) => selected.has(id));
  const someVisibleSelected =
    !allVisibleSelected && visiblePendingIds.some((id) => selected.has(id));

  const toggleOne = (id: string, next: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (next) n.add(id); else n.delete(id);
      return n;
    });
  };

  const toggleAllVisible = (next: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (next) visiblePendingIds.forEach((id) => n.add(id));
      else visiblePendingIds.forEach((id) => n.delete(id));
      return n;
    });
  };

  const clearSelection = () => setSelected(new Set());

  /**
   * Build a CSV from the given requests and trigger a browser download.
   * Used for both "export selected" and "export filtered" so the columns
   * stay consistent. Filename includes the scope so multiple exports don't
   * collide.
   */
  const downloadRequestsCsv = (
    items: UpdateRequestWithCustomer[],
    scope: string,
  ) => {
    if (items.length === 0) return;
    const headers = [
      "request_id",
      "submitted_at",
      "status",
      "customer_name",
      "customer_email",
      ...EDITABLE_FIELDS.map((f) => `requested_${f}`),
      "message",
    ];
    const rows: CsvRow[] = items.map((r) => {
      const row: CsvRow = {
        request_id: r.id,
        submitted_at: new Date(r.created_at).toISOString(),
        status: r.status,
        customer_name: r.customer?.name ?? "",
        customer_email: r.customer?.email ?? "",
        message: r.message ?? "",
      };
      for (const f of EDITABLE_FIELDS) {
        row[`requested_${f}`] = (r[f] as string | null) ?? "";
      }
      return row;
    });
    const csv = rowsToCsv(headers, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `update-requests-${scope}-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: `Exported ${items.length} request${items.length === 1 ? "" : "s"}`,
    });
  };

  const exportSelectedCsv = () =>
    downloadRequestsCsv(selectedRequests, "selected");

  /**
   * Export the search/sort-filtered list, narrowed further to whichever
   * statuses are checked in the export popover. The status filter on the
   * page narrows what's visible; the export scope narrows what's written.
   */
  const exportFilteredCsv = () => {
    const items = visibleRequests.filter((r) => exportStatuses.has(r.status));
    const scope =
      exportStatuses.size === 3
        ? "all"
        : Array.from(exportStatuses).sort().join("-") || "none";
    downloadRequestsCsv(items, scope);
    setExportOpen(false);
  };

  const toggleExportStatus = (s: UpdateRequestStatus, next: boolean) => {
    setExportStatuses((prev) => {
      const n = new Set(prev);
      if (next) n.add(s); else n.delete(s);
      return n;
    });
  };

  // Count of rows that *would* be exported with the current scope + filters.
  const exportPreviewCount = useMemo(
    () => visibleRequests.filter((r) => exportStatuses.has(r.status)).length,
    [visibleRequests, exportStatuses],
  );

  // Bulk approve/reject — runs items in parallel and reports a combined result.
  const bulkMut = useMutation({
    mutationFn: async (action: "approve" | "reject") => {
      if (!user) throw new Error("Not authenticated");
      const targets = selectedRequests; // snapshot
      const results = await Promise.allSettled(
        targets.map((r) =>
          action === "approve"
            ? approveRequest(r, user.id)
            : rejectRequest(r.id, user.id),
        ),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      return { action, ok, fail, total: results.length };
    },
    onSuccess: ({ action, ok, fail, total }) => {
      qc.invalidateQueries({ queryKey: ["update-requests"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      clearSelection();
      setBulkConfirm(null);
      const verb = action === "approve" ? "approved" : "rejected";
      if (fail === 0) {
        toast({ title: `${ok} request${ok === 1 ? "" : "s"} ${verb}` });
      } else {
        toast({
          title: `${ok} of ${total} ${verb}`,
          description: `${fail} failed — try again or review individually.`,
          variant: fail === total ? "destructive" : "default",
        });
      }
    },
    onError: (e: Error) => {
      toast({ title: "Bulk action failed", description: e.message, variant: "destructive" });
      setBulkConfirm(null);
    },
  });

  const bulkBusy = bulkMut.isPending;
  const selectedCount = selectedRequests.length;

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold tracking-display">Customer update requests</h1>
          <p className="text-sm text-muted-foreground">
            Review changes customers have requested to their profile.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inbox</CardTitle>
            <CardDescription>
              Approving a request writes the new values to the customer record.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filter / search / sort controls */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by status">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label} ({counts[o.value]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by company or email…"
                  className="pl-9"
                  aria-label="Search update requests"
                />
              </div>

              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="w-full sm:w-[200px]" aria-label="Sort requests">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={exportFilteredCsv}
                disabled={visibleRequests.length === 0}
                className="w-full sm:w-auto"
                title="Export the currently filtered list as CSV"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Active filter summary */}
            <div className="text-xs text-muted-foreground">
              Showing {visibleRequests.length} of {counts.all} request{counts.all === 1 ? "" : "s"}
              {statusFilter !== "all" && ` · ${statusLabel}`}
              {search.trim() && ` · matching "${search.trim()}"`}
            </div>

            {/* Select-all + bulk action bar — only useful while pending rows are visible. */}
            {visiblePending.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
                <Checkbox
                  checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                  onCheckedChange={(v) => toggleAllVisible(v === true)}
                  disabled={bulkBusy}
                  aria-label="Select all visible pending requests"
                />
                <span className="text-sm">
                  {selectedCount > 0
                    ? `${selectedCount} selected`
                    : `Select all (${visiblePending.length} pending)`}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {selectedCount > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearSelection}
                      disabled={bulkBusy}
                    >
                      Clear
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportSelectedCsv}
                    disabled={bulkBusy || selectedCount === 0}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Export CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setBulkConfirm("reject")}
                    disabled={bulkBusy || selectedCount === 0}
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setBulkConfirm("approve")}
                    disabled={bulkBusy || selectedCount === 0}
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Approve
                  </Button>
                </div>
              </div>
            )}

            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
            ) : visibleRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {search.trim()
                  ? `No ${statusFilter === "all" ? "" : statusLabel + " "}requests match "${search.trim()}".`
                  : `No ${statusFilter === "all" ? "" : statusLabel + " "}requests.`}
              </p>
            ) : (
              <ul className="space-y-3">
                {visibleRequests.map((r) => {
                  const isPending = r.status === "pending";
                  return (
                    <RequestRow
                      key={r.id}
                      request={r}
                      onReview={setReviewing}
                      selected={isPending ? selected.has(r.id) : undefined}
                      onSelectedChange={isPending ? (v) => toggleOne(r.id, v) : undefined}
                      disabled={bulkBusy}
                    />
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ReviewDialog request={reviewing} onClose={() => setReviewing(null)} />

      {/* Bulk confirm */}
      <AlertDialog
        open={bulkConfirm !== null}
        onOpenChange={(o) => !o && !bulkBusy && setBulkConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkConfirm === "approve" ? "Approve" : "Reject"} {selectedCount} request
              {selectedCount === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkConfirm === "approve"
                ? "Each selected request will be applied to its customer record. This cannot be undone."
                : "Each selected request will be marked as rejected. The customer records will not change."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (bulkConfirm) bulkMut.mutate(bulkConfirm);
              }}
              disabled={bulkBusy}
              className={
                bulkConfirm === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {bulkBusy
                ? "Working…"
                : bulkConfirm === "approve"
                ? "Approve all"
                : "Reject all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
