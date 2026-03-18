import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useExpense, useUpdateExpenseStatus, useDeleteExpense } from "@/hooks/useExpenses";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useAuth } from "@/contexts/AuthContext";
import { ExpenseDrawer } from "@/components/expenses/ExpenseDrawer";
import {
  ExpenseStatusBadge,
  ExpenseCategoryBadge,
} from "@/components/expenses/ExpenseStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  Receipt,
  ExternalLink,
  CheckCircle,
  Ban,
  Pencil,
  Trash2,
  User,
  FileText,
  Tag,
  DollarSign,
  Clock,
  CalendarDays,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount);

const categoryLabels: Record<string, string> = {
  Transport: "Ulaşım",
  Accommodation: "Konaklama",
  Meals: "Yemek",
  "Equipment Rental": "Ekipman Kiralama",
  Venue: "Mekan",
  Personnel: "Personel",
  Marketing: "Pazarlama",
  Other: "Diğer",
};

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: expense, isLoading } = useExpense(id);
  const { data: allLogs = [] } = useActivityLogs(100);
  const { user, role } = useAuth();
  const updateStatus = useUpdateExpenseStatus();
  const deleteExpense = useDeleteExpense();
  const isAdmin = role === "admin";

  const [editOpen, setEditOpen] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Filter activity logs related to this expense
  const expenseLogs = allLogs.filter(
    (l) => l.entity_type === "expense" && l.entity_id === id
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-12">
          <p className="text-sm text-muted-foreground">Masraf yükleniyor…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!expense) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-12 gap-4">
          <p className="text-sm text-muted-foreground">Masraf bulunamadı.</p>
          <Button variant="outline" onClick={() => navigate("/expenses")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Masraflara Dön
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleApprove = () => {
    if (!user) return;
    updateStatus.mutate({ id: expense.id, status: "approved", approved_by: user.id });
  };

  const handleReject = () => {
    if (!user) return;
    updateStatus.mutate(
      {
        id: expense.id,
        status: "rejected",
        approved_by: user.id,
        rejection_reason: rejectionReason.trim() || undefined,
      },
      { onSuccess: () => { setRejectDialog(false); setRejectionReason(""); } }
    );
  };

  const handleDelete = () => {
    deleteExpense.mutate(expense.id, {
      onSuccess: () => navigate("/expenses"),
    });
  };

  const infoItems = [
    {
      icon: Tag,
      label: "Kategori",
      value: <ExpenseCategoryBadge category={expense.category} />,
    },
    {
      icon: DollarSign,
      label: "Tutar",
      value: <span className="text-lg font-semibold text-foreground">{formatCurrency(expense.amount)}</span>,
    },
    {
      icon: Calendar,
      label: "Masraf Tarihi",
      value: format(new Date(expense.expense_date), "dd MMMM yyyy", { locale: tr }),
    },
    {
      icon: FileText,
      label: "Etkinlik",
      value: expense.event_name ? (
        <Link to={`/events`} className="text-primary hover:underline">
          {expense.event_name}
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    },
    {
      icon: Clock,
      label: "Durum",
      value: <ExpenseStatusBadge status={expense.status} />,
    },
    {
      icon: CalendarDays,
      label: "Oluşturulma",
      value: format(new Date(expense.created_at), "dd MMM yyyy HH:mm", { locale: tr }),
    },
  ];

  // Build a timeline from expense data
  const timeline: { date: string; label: string; detail?: string }[] = [
    {
      date: expense.created_at,
      label: "Masraf oluşturuldu",
      detail: `${formatCurrency(expense.amount)} — ${categoryLabels[expense.category] || expense.category}`,
    },
  ];

  if (expense.status === "approved" && expense.approved_at) {
    timeline.push({
      date: expense.approved_at,
      label: "Masraf onaylandı",
    });
  }

  if (expense.status === "rejected" && expense.approved_at) {
    timeline.push({
      date: expense.approved_at,
      label: "Masraf reddedildi",
      detail: expense.rejection_reason || undefined,
    });
  }

  if (expense.updated_at !== expense.created_at && expense.updated_at !== expense.approved_at) {
    timeline.push({
      date: expense.updated_at,
      label: "Masraf güncellendi",
    });
  }

  // Add activity logs to timeline
  expenseLogs.forEach((log) => {
    timeline.push({
      date: log.created_at,
      label: log.action,
      detail: log.details || undefined,
    });
  });

  // Sort timeline descending
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/expenses")}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                {expense.description}
              </h1>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(expense.amount)} · {format(new Date(expense.expense_date), "dd MMM yyyy", { locale: tr })}
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex gap-2">
              {expense.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[hsl(var(--success))] border-[hsl(var(--success))]/30 hover:bg-[hsl(var(--success))]/10"
                    onClick={handleApprove}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Onayla
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setRejectDialog(true)}
                  >
                    <Ban className="h-4 w-4 mr-1" /> Reddet
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-1" /> Düzenle
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Sil
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Masraf Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {infoItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-muted">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <div className="text-sm text-foreground">{item.value}</div>
                    </div>
                  </div>
                ))}

                {expense.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notlar</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{expense.notes}</p>
                    </div>
                  </>
                )}

                {expense.rejection_reason && (
                  <>
                    <Separator />
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <p className="text-xs text-destructive font-medium mb-1">Red Sebebi</p>
                      <p className="text-sm text-destructive">{expense.rejection_reason}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Receipt */}
            {expense.receipt_url && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Makbuz / Fatura
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={expense.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline p-3 rounded-md border border-border hover:bg-muted/50 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {expense.receipt_name || "Makbuzu Görüntüle"}
                  </a>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Timeline sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Geçmiş
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Henüz kayıt yok.</p>
                ) : (
                  <div className="relative space-y-6">
                    {/* Vertical line */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

                    {timeline.map((entry, i) => (
                      <div key={i} className="relative flex gap-3 pl-6">
                        <div className="absolute left-0 top-1.5 h-[14px] w-[14px] rounded-full border-2 border-primary bg-background" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{entry.label}</p>
                          {entry.detail && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {entry.detail}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(entry.date), "dd MMM yyyy HH:mm", { locale: tr })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit drawer */}
      <ExpenseDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        expense={expense}
      />

      {/* Reject dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masrafı Reddet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong>{expense.description}</strong> — {formatCurrency(expense.amount)}
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
            <Button variant="outline" onClick={() => setRejectDialog(false)}>İptal</Button>
            <Button variant="destructive" onClick={handleReject}>Reddet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masrafı Sil</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>{expense.description}</strong> — {formatCurrency(expense.amount)} masrafını silmek
            istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>İptal</Button>
            <Button variant="destructive" onClick={handleDelete}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
