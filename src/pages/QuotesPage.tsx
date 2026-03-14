import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useQuotes, useUpdateQuote, type QuoteStatus } from "@/hooks/useQuotes";
import { CreateQuoteDialog } from "@/components/quotes/CreateQuoteDialog";
import { QuoteStatusBadge } from "@/components/quotes/QuoteStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, FileText, CheckCircle, Clock, TrendingUp, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

const fmt = (v: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const statuses: QuoteStatus[] = ["Draft", "Sent", "Approved", "Rejected", "Cancelled"];

export default function QuotesPage() {
  const { data: quotes = [], isLoading } = useQuotes();
  const update = useUpdateQuote();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = quotes;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (qt) =>
          qt.quote_number.toLowerCase().includes(q) ||
          qt.customer_name.toLowerCase().includes(q) ||
          qt.event_name.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") list = list.filter((qt) => qt.status === statusFilter);
    return list;
  }, [quotes, search, statusFilter]);

  const totalValue = quotes.reduce((s, q) => s + q.total, 0);
  const approvedValue = quotes.filter((q) => q.status === "Approved").reduce((s, q) => s + q.total, 0);
  const draftCount = quotes.filter((q) => q.status === "Draft").length;
  const sentCount = quotes.filter((q) => q.status === "Sent").length;

  const stats = [
    { label: "Total Quotes", value: quotes.length, icon: FileText, color: "text-primary" },
    { label: "Approved Value", value: fmt(approvedValue), icon: CheckCircle, color: "text-[hsl(var(--success))]" },
    { label: "Pipeline Value", value: fmt(totalValue), icon: TrendingUp, color: "text-[hsl(var(--warning))]" },
    { label: "Pending", value: `${draftCount} draft · ${sentCount} sent`, icon: Clock, color: "text-accent" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Quotes & Proposals</h1>
            <p className="text-sm text-muted-foreground">Create, price, and manage event proposals.</p>
          </div>
          <CreateQuoteDialog />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="phantom-shadow border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-lg bg-secondary p-2.5 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-semibold text-foreground">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search quotes…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="phantom-shadow border-border/50">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <p className="text-sm text-muted-foreground">Loading quotes…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <p className="text-sm text-muted-foreground">No quotes found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q) => (
                  <TableRow key={q.id} className="cursor-pointer" onClick={() => navigate(`/quotes/${q.id}`)}>
                    <TableCell className="font-mono text-sm text-primary">{q.quote_number}</TableCell>
                    <TableCell className="font-medium text-foreground">{q.customer_name}</TableCell>
                    <TableCell className="text-muted-foreground">{q.event_name}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(q.event_date)}</TableCell>
                    <TableCell><QuoteStatusBadge status={q.status} /></TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">{fmt(q.total)}</TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => navigate(`/quotes/${q.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {q.status === "Draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => update.mutate({ id: q.id, status: "Sent" })}
                          >
                            Send
                          </Button>
                        )}
                        {q.status === "Sent" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-[hsl(var(--success))]"
                            onClick={() => update.mutate({ id: q.id, status: "Approved" })}
                          >
                            Approve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
