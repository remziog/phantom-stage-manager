import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Expense } from "@/hooks/useExpenses";

const fmt = (v: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });

const categoryLabels: Record<string, string> = {
  Transport: "Ulaşım", Accommodation: "Konaklama", Meals: "Yemek",
  "Equipment Rental": "Ekipman Kiralama", Venue: "Mekan",
  Personnel: "Personel", Marketing: "Pazarlama", Other: "Diğer",
};

export function PendingExpensesAlert({ expenses }: { expenses: Expense[] }) {
  const navigate = useNavigate();
  const pending = expenses.filter((e) => e.status === "pending");
  const pendingTotal = pending.reduce((s, e) => s + e.amount, 0);

  if (pending.length === 0) return null;

  return (
    <Card className="phantom-shadow border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-[hsl(var(--warning))]" /> Onay Bekleyen Masraflar
            <Badge variant="outline" className="ml-1 text-xs border-[hsl(var(--warning))] text-[hsl(var(--warning))]">
              {pending.length}
            </Badge>
          </CardTitle>
          <button onClick={() => navigate("/expenses")} className="text-xs text-primary hover:underline">
            Tümünü gör
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Toplam bekleyen: <span className="font-semibold text-[hsl(var(--warning))]">{fmt(pendingTotal)}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-2 max-h-64 overflow-auto">
        {pending.slice(0, 8).map((expense) => (
          <div
            key={expense.id}
            className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2 cursor-pointer hover:bg-secondary transition-colors"
            onClick={() => navigate("/expenses")}
          >
            <div className="min-w-0 flex items-center gap-2">
              <Receipt className="h-3.5 w-3.5 text-[hsl(var(--warning))] shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground truncate">{expense.description}</p>
                <p className="text-xs text-muted-foreground">
                  {categoryLabels[expense.category] || expense.category} · {fmtDate(expense.expense_date)}
                  {expense.event_name && ` · ${expense.event_name}`}
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-foreground tabular-nums shrink-0 ml-2">
              {fmt(expense.amount)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
