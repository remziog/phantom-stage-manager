import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateQuote } from "@/hooks/useQuotes";
import { useCustomers } from "@/hooks/useCustomers";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CreateQuoteDialog() {
  const [open, setOpen] = useState(false);
  const create = useCreateQuote();
  const { data: customers = [] } = useCustomers();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const customerId = fd.get("customer_id") as string;
    const customer = customers.find((c) => c.id === customerId);

    create.mutate(
      {
        customer_id: customerId || null,
        customer_name: customer?.company_name || (fd.get("customer_name") as string) || "Walk-in",
        event_name: (fd.get("event_name") as string).trim(),
        event_date: (fd.get("event_date") as string) || null,
        event_end_date: (fd.get("event_end_date") as string) || null,
        venue: (fd.get("venue") as string) || null,
        notes: (fd.get("notes") as string) || null,
      },
      {
        onSuccess: (data) => {
          setOpen(false);
          navigate(`/quotes/${data.id}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Yeni Teklif
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Teklif Oluştur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="customer_id">Müşteri</Label>
            <Select name="customer_id">
              <SelectTrigger><SelectValue placeholder="Müşteri seçin" /></SelectTrigger>
              <SelectContent>
                {customers.filter((c) => c.is_active).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event_name">Etkinlik Adı *</Label>
            <Input id="event_name" name="event_name" required maxLength={200} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="event_date">Başlangıç Tarihi</Label>
              <Input id="event_date" name="event_date" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event_end_date">Bitiş Tarihi</Label>
              <Input id="event_end_date" name="event_end_date" type="date" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venue">Mekan</Label>
            <Input id="venue" name="venue" maxLength={300} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea id="notes" name="notes" rows={2} maxLength={1000} />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? "Oluşturuluyor…" : "Oluştur & Kalem Ekle"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}