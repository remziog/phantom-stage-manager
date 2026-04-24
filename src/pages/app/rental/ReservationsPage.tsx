import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { listReservations, createReservation, updateReservationStatus, type TransactionStatus } from "@/services/reservations";
import { listCustomers } from "@/services/customers";
import { listAssets } from "@/services/assets";
import { generateInvoiceFromReservation } from "@/services/invoices";
import { Plus, FileText } from "lucide-react";
import { PermissionGate } from "@/components/PermissionGate";

const STATUS_LABELS: Record<TransactionStatus, string> = {
  draft: "Draft", confirmed: "Confirmed", active: "Active", returned: "Returned", cancelled: "Cancelled",
};

const STATUS_TONE: Record<TransactionStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  confirmed: "bg-warning/15 text-warning",
  active: "bg-primary/15 text-primary",
  returned: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

export default function ReservationsPage() {
  const { user, company } = useAuth();
  const cid = company?.id ?? "";
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["reservations", cid], queryFn: () => listReservations(cid), enabled: !!cid,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", cid], queryFn: () => listCustomers(cid), enabled: !!cid,
  });
  const { data: assets = [] } = useQuery({
    queryKey: ["assets", cid], queryFn: () => listAssets(cid), enabled: !!cid,
  });

  const createMut = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations", cid] });
      toast({ title: "Reservation created" });
      setOpen(false);
    },
    onError: (e) => toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TransactionStatus }) => updateReservationStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations", cid] }),
  });

  const invoiceMut = useMutation({
    mutationFn: generateInvoiceFromReservation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", cid] });
      toast({ title: "Invoice generated", description: "Open Invoices to view." });
    },
    onError: (e) => toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }),
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !cid) return;
    const f = new FormData(e.currentTarget);
    createMut.mutate({
      company_id: cid,
      created_by: user.id,
      type: "rental",
      customer_id: String(f.get("customer_id") || "") || null,
      start_date: String(f.get("start_date")),
      end_date: String(f.get("end_date")),
      total_amount: Number(f.get("total_amount") || 0),
      currency: company?.currency ?? "USD",
      notes: String(f.get("notes") || "") || null,
      status: "draft",
    });
  };

  // Calendar grid: month view, simple
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const days: (Date | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(today.getFullYear(), today.getMonth(), i + 1)),
  ];
  const reservationsByDay = (d: Date) => reservations.filter((r) => {
    const ds = d.toISOString().slice(0, 10);
    return r.start_date && r.end_date && ds >= r.start_date && ds <= r.end_date;
  });

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-display">Reservations</h1>
            <p className="text-sm text-muted-foreground">{reservations.length} total</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <PermissionGate permission="manage:reservations">
                <Button><Plus className="h-4 w-4 mr-2" />New reservation</Button>
              </PermissionGate>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New reservation</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Customer</Label>
                  <Select name="customer_id" required>
                    <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {customers.length === 0 && <p className="text-xs text-muted-foreground">No customers yet — add one first.</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Start date</Label><Input name="start_date" type="date" required /></div>
                  <div className="space-y-1.5"><Label>End date</Label><Input name="end_date" type="date" required /></div>
                </div>
                <div className="space-y-1.5"><Label>Total amount</Label><Input name="total_amount" type="number" step="0.01" min={0} defaultValue={0} /></div>
                <div className="space-y-1.5"><Label>Notes</Label><Textarea name="notes" rows={3} /></div>
                <DialogFooter><Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? "Saving…" : "Create"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">Loading…</TableCell></TableRow>
                    ) : reservations.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No reservations yet.</TableCell></TableRow>
                    ) : reservations.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.customer?.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.start_date} → {r.end_date}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.currency} {Number(r.total_amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Select value={r.status} onValueChange={(v) => statusMut.mutate({ id: r.id, status: v as TransactionStatus })}>
                            <SelectTrigger className={`w-32 h-7 text-xs ${STATUS_TONE[r.status]}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(Object.keys(STATUS_LABELS) as TransactionStatus[]).map((s) => (
                                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <PermissionGate permission="manage:invoices" hideWhenDenied>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => user && cid && invoiceMut.mutate({
                                companyId: cid, reservationId: r.id, customerId: r.customer_id,
                                total: Number(r.total_amount), currency: r.currency, userId: user.id,
                              })}
                            >
                              <FileText className="h-4 w-4 mr-1" /> Invoice
                            </Button>
                          </PermissionGate>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium mb-3">
                  {today.toLocaleString("default", { month: "long", year: "numeric" })}
                </div>
                <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="px-2">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {days.map((d, i) => {
                    if (!d) return <div key={i} className="h-20" />;
                    const dayReservations = reservationsByDay(d);
                    const isToday = d.toDateString() === today.toDateString();
                    return (
                      <div key={i} className={`h-20 p-1 rounded border text-xs ${isToday ? "border-primary" : "border-border"}`}>
                        <div className={isToday ? "text-primary font-semibold" : "text-muted-foreground"}>{d.getDate()}</div>
                        <div className="space-y-0.5 mt-1">
                          {dayReservations.slice(0, 2).map((r) => (
                            <div key={r.id} className="truncate text-[10px] px-1 rounded bg-primary/15 text-primary">
                              {r.customer?.name ?? "—"}
                            </div>
                          ))}
                          {dayReservations.length > 2 && <div className="text-[10px] text-muted-foreground">+{dayReservations.length - 2}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
