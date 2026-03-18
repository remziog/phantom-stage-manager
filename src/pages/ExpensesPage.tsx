import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useExpenses, useUpdateExpenseStatus, useDeleteExpense } from "@/hooks/useExpenses";
import { useAuth } from "@/contexts/AuthContext";
import { AddExpenseDrawer } from "@/components/expenses/AddExpenseDrawer";
import {
  ExpenseStatusBadge,
  ExpenseCategoryBadge,
} from "@/components/expenses/ExpenseStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Receipt,
  CheckCircle,
  XCircle,
  ExternalLink,
  TrendingUp,
  Clock,
  Ban,
  FileDown,
} from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import type { Expense } from "@/hooks/useExpenses";
import { generateExpensePdf } from "@/components/expenses/generateExpensePdf";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
    amount
  );

export default function ExpensesPage() {
  const { data: expenses = [], isLoading } = useExpenses();
  const { settings: companySettings } = useCompanySettings();
  const { user, role } = useAuth();
  const updateStatus = useUpdateExpenseStatus();
  const isAdmin = role === "admin";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [rejectDialog, setRejectDialog] = useState<Expense | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const dateRangeLabels: Record<string, string> = {
    all: "Tüm Tarihler",
    this_month: "Bu Ay",
    last_3: "Son 3 Ay",
    last_6: "Son 6 Ay",
  };

  const filtered = useMemo(() => {
    const now = new Date();
    let dateFrom: Date | null = null;
    if (dateRangeFilter === "this_month") dateFrom = startOfMonth(now);
    else if (dateRangeFilter === "last_3") dateFrom = startOfMonth(subMonths(now, 2));
    else if (dateRangeFilter === "last_6") dateFrom = startOfMonth(subMonths(now, 5));

    return expenses.filter((e) => {
      const matchSearch =
        !search ||
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        e.event_name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || e.status === statusFilter;
      const matchCategory =
        categoryFilter === "all" || e.category === categoryFilter;
      const matchDate = !dateFrom || new Date(e.expense_date) >= dateFrom;
      return matchSearch && matchStatus && matchCategory && matchDate;
    });
  }, [expenses, search, statusFilter, categoryFilter, dateRangeFilter]);

  const totals = useMemo(() => {
    const all = expenses.reduce((s, e) => s + e.amount, 0);
    const approved = expenses
      .filter((e) => e.status === "approved")
      .reduce((s, e) => s + e.amount, 0);
    const pending = expenses
      .filter((e) => e.status === "pending")
      .reduce((s, e) => s + e.amount, 0);
    return { all, approved, pending };
  }, [expenses]);

  const handleApprove = (expense: Expense) => {
    if (!user) return;
    updateStatus.mutate({
      id: expense.id,
      status: "approved",
      approved_by: user.id,
    });
  };

  const handleReject = () => {
    if (!rejectDialog || !user) return;
    updateStatus.mutate(
      {
        id: rejectDialog.id,
        status: "rejected",
        approved_by: user.id,
        rejection_reason: rejectionReason.trim() || undefined,
      },
      { onSuccess: () => { setRejectDialog(null); setRejectionReason(""); } }
    );
  };

  const handleExportPdf = () => {
    if (filtered.length === 0) return;
    const label = [
      dateRangeFilter !== "all" ? dateRangeLabels[dateRangeFilter] : null,
      statusFilter !== "all" ? statusLabels[statusFilter] : null,
      categoryFilter !== "all" ? (categoryLabels[categoryFilter] || categoryFilter) : null,
      search ? `"${search}"` : null,
    ].filter(Boolean).join(" · ");
    generateExpensePdf({
      expenses: filtered,
      company: companySettings,
      dateRange: { label: label || "Tüm Kayıtlar" },
    });
  };

  const statusLabels: Record<string, string> = {
    pending: "Beklemede", approved: "Onaylı", rejected: "Reddedildi",
  };
  const categoryLabels: Record<string, string> = {
    Transport: "Ulaşım", Accommodation: "Konaklama", Meals: "Yemek",
    "Equipment Rental": "Ekipman Kiralama", Venue: "Mekan",
    Personnel: "Personel", Marketing: "Pazarlama", Other: "Diğer",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-display text-foreground flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Masraflar
            </h1>
            <p className="text-sm text-muted-foreground">
              Etkinlik bazında gider takibi ve onay yönetimi
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={filtered.length === 0}
            >
              <FileDown className="h-4 w-4 mr-1" />
              PDF İndir
            </Button>
            <Button onClick={() => setDrawerOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Masraf Ekle
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Toplam</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(totals.all)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-[hsl(var(--success))]/10">
                <CheckCircle className="h-5 w-5 text-[hsl(var(--success))]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Onaylanan</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(totals.approved)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-[hsl(var(--warning))]/10">
                <Clock className="h-5 w-5 text-[hsl(var(--warning))]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bekleyen</p>
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(totals.pending)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Masraf ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-input border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-input border-border">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="pending">Beklemede</SelectItem>
              <SelectItem value="approved">Onaylanan</SelectItem>
              <SelectItem value="rejected">Reddedilen</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
            <SelectTrigger className="w-[140px] bg-input border-border">
              <SelectValue placeholder="Tarih" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Tarihler</SelectItem>
              <SelectItem value="this_month">Bu Ay</SelectItem>
              <SelectItem value="last_3">Son 3 Ay</SelectItem>
              <SelectItem value="last_6">Son 6 Ay</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] bg-input border-border">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kategoriler</SelectItem>
              <SelectItem value="Transport">Ulaşım</SelectItem>
              <SelectItem value="Accommodation">Konaklama</SelectItem>
              <SelectItem value="Meals">Yemek</SelectItem>
              <SelectItem value="Equipment Rental">Ekipman Kiralama</SelectItem>
              <SelectItem value="Venue">Mekan</SelectItem>
              <SelectItem value="Personnel">Personel</SelectItem>
              <SelectItem value="Marketing">Pazarlama</SelectItem>
              <SelectItem value="Other">Diğer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Expense list */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12">
              <Receipt className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                {expenses.length === 0
                  ? "Henüz masraf kaydı yok."
                  : "Filtrelere uygun masraf bulunamadı."}
              </p>
              {expenses.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDrawerOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" /> İlk Masrafı Ekle
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden phantom-shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Açıklama
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Etkinlik
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tutar
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Makbuz
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Durum
                    </th>
                    {isAdmin && (
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        İşlem
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((expense, index) => (
                    <tr
                      key={expense.id}
                      className="border-b border-border last:border-0 hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                      style={
                        index % 2 === 1
                          ? { backgroundColor: "rgba(255,255,255,0.02)" }
                          : {}
                      }
                    >
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {format(new Date(expense.expense_date), "dd MMM yyyy", {
                          locale: tr,
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">
                          {expense.description}
                        </span>
                        {expense.notes && (
                          <span className="block text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                            {expense.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ExpenseCategoryBadge category={expense.category} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {expense.event_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {expense.receipt_url ? (
                          <a
                            href={expense.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {expense.receipt_name || "Görüntüle"}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ExpenseStatusBadge status={expense.status} />
                        {expense.rejection_reason && (
                          <span className="block text-[10px] text-destructive mt-0.5 truncate max-w-[120px]">
                            {expense.rejection_reason}
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          {expense.status === "pending" && (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-[hsl(var(--success))] hover:text-[hsl(var(--success))]"
                                onClick={() => handleApprove(expense)}
                                title="Onayla"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setRejectDialog(expense)}
                                title="Reddet"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AddExpenseDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />

      {/* Rejection dialog */}
      <Dialog
        open={!!rejectDialog}
        onOpenChange={(o) => !o && setRejectDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masrafı Reddet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong>{rejectDialog?.description}</strong> —{" "}
              {rejectDialog && formatCurrency(rejectDialog.amount)}
            </p>
            <div>
              <Label>Red Sebebi (opsiyonel)</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Neden reddedildiğini belirtin..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reddet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
