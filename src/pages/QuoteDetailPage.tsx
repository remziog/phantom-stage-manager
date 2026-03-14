import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useQuote, useQuoteLineItems, useUpdateQuote, useSaveLineItems } from "@/hooks/useQuotes";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { QuoteStatusBadge } from "@/components/quotes/QuoteStatusBadge";
import { LineItemEditor } from "@/components/quotes/LineItemEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, MapPin, Building2, Download, CheckCircle, XCircle } from "lucide-react";
import { generateQuotePdf } from "@/components/quotes/generateQuotePdf";
import type { QuoteStatus } from "@/hooks/useQuotes";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const fmt = (v: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v);

const statuses: QuoteStatus[] = ["Draft", "Sent", "Approved", "Rejected", "Cancelled"];

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: quote, isLoading } = useQuote(id);
  const { data: lineItems = [], isLoading: loadingItems } = useQuoteLineItems(id);
  const updateQuote = useUpdateQuote();
  const saveLines = useSaveLineItems();
  const { settings: company } = useCompanySettings();
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "team_member";
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(20);

  useEffect(() => {
    if (quote) {
      setDiscount(quote.discount_percent);
      setTax(quote.tax_percent);
    }
  }, [quote]);

  if (isLoading || !quote) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-12">
          <p className="text-sm text-muted-foreground">Loading quote…</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleSaveLineItems = (items: Parameters<typeof saveLines.mutate>[0]["items"]) => {
    const subtotal = items.reduce((s, i) => s + i.line_total, 0);
    const discountedSubtotal = subtotal * (1 - discount / 100);
    const total = Math.round(discountedSubtotal * (1 + tax / 100));

    saveLines.mutate({ quoteId: quote.id, items });
    updateQuote.mutate({ id: quote.id, subtotal, discount_percent: discount, tax_percent: tax, total });
  };

  const handleStatusChange = (status: QuoteStatus) => {
    updateQuote.mutate({ id: quote.id, status });
  };

  const subtotal = quote.subtotal;
  const discountAmount = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (tax / 100);
  const total = afterDiscount + taxAmount;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/quotes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold tracking-tight text-foreground font-mono">
                {quote.quote_number}
              </h1>
              <QuoteStatusBadge status={quote.status} />
            </div>
            <p className="text-sm text-muted-foreground">{quote.event_name}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => generateQuotePdf({ quote, lineItems, company })}
            disabled={lineItems.length === 0}
          >
            <Download className="h-4 w-4" /> Export PDF
          </Button>
          <Select value={quote.status} onValueChange={(v) => handleStatusChange(v as QuoteStatus)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="phantom-shadow border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="text-sm font-medium text-foreground">{quote.customer_name}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="phantom-shadow border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Calendar className="h-5 w-5 text-accent" />
              <div>
                <p className="text-xs text-muted-foreground">Event Dates</p>
                <p className="text-sm font-medium text-foreground">
                  {quote.event_date
                    ? new Date(quote.event_date).toLocaleDateString("tr-TR")
                    : "TBD"}
                  {quote.event_end_date && ` — ${new Date(quote.event_end_date).toLocaleDateString("tr-TR")}`}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="phantom-shadow border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <MapPin className="h-5 w-5 text-[hsl(var(--warning))]" />
              <div>
                <p className="text-xs text-muted-foreground">Venue</p>
                <p className="text-sm font-medium text-foreground">{quote.venue || "TBD"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card className="phantom-shadow border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingItems ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <LineItemEditor
                quoteId={quote.id}
                initialItems={lineItems}
                onSave={handleSaveLineItems}
                saving={saveLines.isPending}
              />
            )}
          </CardContent>
        </Card>

        {/* Pricing Summary */}
        <Card className="phantom-shadow border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Pricing Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center gap-4">
                <div className="space-y-1.5 flex-1">
                  <Label>Discount %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={discount}
                    onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label>Tax (KDV) %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={tax}
                    onChange={(e) => setTax(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  />
                </div>
              </div>
              <div className="space-y-2 text-sm tabular-nums">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">{fmt(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount ({discount}%)</span>
                    <span className="text-destructive">-{fmt(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">KDV ({tax}%)</span>
                  <span className="text-foreground">{fmt(taxAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">{fmt(total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
