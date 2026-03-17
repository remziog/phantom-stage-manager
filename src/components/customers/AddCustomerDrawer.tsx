import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCustomer } from "@/hooks/useCustomers";
import { Plus } from "lucide-react";

const customerTypes = ["Corporate", "Agency", "Individual", "Government"] as const;

export function AddCustomerDrawer() {
  const [open, setOpen] = useState(false);
  const create = useCreateCustomer();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    create.mutate(
      {
        company_name: fd.get("company_name") as string,
        contact_name: fd.get("contact_name") as string,
        email: (fd.get("email") as string) || null,
        phone: (fd.get("phone") as string) || null,
        city: (fd.get("city") as string) || null,
        address: (fd.get("address") as string) || null,
        customer_type: (fd.get("customer_type") as any) || "Corporate",
        tax_id: (fd.get("tax_id") as string) || null,
        notes: (fd.get("notes") as string) || null,
        is_active: true,
      },
      { onSuccess: () => setOpen(false) }
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Müşteri Ekle
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Müşteri Ekle</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="company_name">Şirket Adı *</Label>
              <Input id="company_name" name="company_name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_name">İletişim Kişisi *</Label>
              <Input id="contact_name" name="contact_name" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" name="phone" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city">Şehir</Label>
              <Input id="city" name="city" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer_type">Tür</Label>
              <Select name="customer_type" defaultValue="Corporate">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customerTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tax_id">Vergi No</Label>
              <Input id="tax_id" name="tax_id" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Adres</Label>
              <Input id="address" name="address" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? "Ekleniyor…" : "Müşteri Ekle"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}