import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateQuote } from "@/hooks/useQuotes";
import { useCustomers } from "@/hooks/useCustomers";
import { Plus, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "Müşteri" },
  { id: 2, label: "Etkinlik" },
  { id: 3, label: "Detaylar" },
];

export function CreateQuoteDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customer_id: "",
    event_name: "",
    event_date: "",
    event_end_date: "",
    venue: "",
    notes: "",
  });
  const create = useCreateQuote();
  const { data: customers = [] } = useCustomers();
  const navigate = useNavigate();

  const selectedCustomer = customers.find((c) => c.id === formData.customer_id);

  const canProceed = () => {
    if (step === 1) return true; // customer is optional
    if (step === 2) return formData.event_name.trim().length > 0;
    return true;
  };

  const handleSubmit = () => {
    create.mutate(
      {
        customer_id: formData.customer_id || null,
        customer_name: selectedCustomer?.company_name || "Walk-in",
        event_name: formData.event_name.trim(),
        event_date: formData.event_date || null,
        event_end_date: formData.event_end_date || null,
        venue: formData.venue || null,
        notes: formData.notes || null,
      },
      {
        onSuccess: (data) => {
          setOpen(false);
          setStep(1);
          setFormData({ customer_id: "", event_name: "", event_date: "", event_end_date: "", venue: "", notes: "" });
          navigate(`/quotes/${data.id}`);
        },
      }
    );
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) { setStep(1); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Yeni Teklif
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Teklif Oluştur</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-4">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={cn(
                "flex items-center justify-center h-7 w-7 rounded-full text-xs font-medium border transition-colors",
                step >= s.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border"
              )}>
                {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
              </div>
              <span className={cn("text-xs font-medium", step >= s.id ? "text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
              {i < steps.length - 1 && <div className={cn("flex-1 h-px", step > s.id ? "bg-primary" : "bg-border")} />}
            </div>
          ))}
        </div>

        {/* Step 1: Customer */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Müşteri Seçin</Label>
              <Select value={formData.customer_id} onValueChange={(v) => setFormData((p) => ({ ...p, customer_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Müşteri seçin (opsiyonel)" /></SelectTrigger>
                <SelectContent>
                  {customers.filter((c) => c.is_active).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCustomer && (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm space-y-1">
                <p className="font-medium text-foreground">{selectedCustomer.company_name}</p>
                <p className="text-muted-foreground">{selectedCustomer.contact_name}</p>
                {selectedCustomer.email && <p className="text-muted-foreground">{selectedCustomer.email}</p>}
                {selectedCustomer.phone && <p className="text-muted-foreground">{selectedCustomer.phone}</p>}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Event */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="event_name">Etkinlik Adı *</Label>
              <Input
                id="event_name"
                value={formData.event_name}
                onChange={(e) => setFormData((p) => ({ ...p, event_name: e.target.value }))}
                required
                maxLength={200}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="event_date">Başlangıç Tarihi</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData((p) => ({ ...p, event_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event_end_date">Bitiş Tarihi</Label>
                <Input
                  id="event_end_date"
                  type="date"
                  value={formData.event_end_date}
                  onChange={(e) => setFormData((p) => ({ ...p, event_end_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="venue">Mekan</Label>
              <Input
                id="venue"
                value={formData.venue}
                onChange={(e) => setFormData((p) => ({ ...p, venue: e.target.value }))}
                maxLength={300}
              />
            </div>
          </div>
        )}

        {/* Step 3: Details & Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
                maxLength={1000}
              />
            </div>
            {/* Summary */}
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm space-y-1.5">
              <p className="font-medium text-foreground">Özet</p>
              <p className="text-muted-foreground">Müşteri: <span className="text-foreground">{selectedCustomer?.company_name || "Walk-in"}</span></p>
              <p className="text-muted-foreground">Etkinlik: <span className="text-foreground">{formData.event_name}</span></p>
              {formData.event_date && (
                <p className="text-muted-foreground">
                  Tarih: <span className="text-foreground">
                    {new Date(formData.event_date).toLocaleDateString("tr-TR")}
                    {formData.event_end_date && ` — ${new Date(formData.event_end_date).toLocaleDateString("tr-TR")}`}
                  </span>
                </p>
              )}
              {formData.venue && <p className="text-muted-foreground">Mekan: <span className="text-foreground">{formData.venue}</span></p>}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Geri
          </Button>
          {step < 3 ? (
            <Button
              size="sm"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="gap-1.5"
            >
              İleri <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={create.isPending || !canProceed()}
              className="gap-1.5"
            >
              {create.isPending ? "Oluşturuluyor…" : "Oluştur & Kalem Ekle"}
              <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
