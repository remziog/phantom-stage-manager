import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { listInvoices, updateInvoiceStatus, type InvoiceStatus } from "@/services/invoices";
import { generateInvoicePdf } from "@/services/invoicePdf";
import { Download } from "lucide-react";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue", cancelled: "Cancelled",
};
const STATUS_TONE: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/15 text-primary",
  paid: "bg-success/15 text-success",
  overdue: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export default function InvoicesPage() {
  const { company } = useAuth();
  const cid = company?.id ?? "";
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", cid], queryFn: () => listInvoices(cid), enabled: !!cid,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) => updateInvoiceStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices", cid] }),
  });

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-display">Invoices</h1>
          <p className="text-sm text-muted-foreground">{invoices.length} total — generate from a reservation</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Issue date</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">Loading…</TableCell></TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">No invoices yet.</TableCell></TableRow>
                ) : invoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium tabular-nums">{i.invoice_number}</TableCell>
                    <TableCell>{i.customer?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{i.issue_date}</TableCell>
                    <TableCell className="text-muted-foreground">{i.due_date ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{i.currency} {Number(i.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Select value={i.status} onValueChange={(v) => statusMut.mutate({ id: i.id, status: v as InvoiceStatus })}>
                        <SelectTrigger className={`w-32 h-7 text-xs ${STATUS_TONE[i.status]}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => company && generateInvoicePdf(i, company)}>
                        <Download className="h-4 w-4 mr-1" /> PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Tip: open a reservation in the Reservations page and click <strong>Invoice</strong> to generate one.
        </p>
      </div>
    </AppShell>
  );
}
