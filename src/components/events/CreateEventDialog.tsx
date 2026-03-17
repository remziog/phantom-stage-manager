import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateEvent } from "@/hooks/useEvents";
import { useCustomers } from "@/hooks/useCustomers";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const create = useCreateEvent();
  const { data: customers = [] } = useCustomers();
  const { data: team = [] } = useTeamMembers();
  const navigate = useNavigate();

  const pms = team.filter((t) => t.role === "Project Manager");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const customerId = fd.get("customer_id") as string;
    const customer = customers.find((c) => c.id === customerId);

    create.mutate(
      {
        name: (fd.get("name") as string).trim(),
        customer_id: customerId || null,
        customer_name: customer?.company_name || "Walk-in",
        quote_id: null,
        status: "Planning",
        start_date: fd.get("start_date") as string,
        end_date: fd.get("end_date") as string,
        load_in_date: (fd.get("load_in_date") as string) || null,
        load_out_date: (fd.get("load_out_date") as string) || null,
        venue: (fd.get("venue") as string) || null,
        venue_address: (fd.get("venue_address") as string) || null,
        project_manager_id: (fd.get("pm_id") as string) || null,
        notes: (fd.get("notes") as string) || null,
      },
      {
        onSuccess: (data) => {
          setOpen(false);
          navigate(`/events/${data.id}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Yeni Etkinlik
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Etkinlik Oluştur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Etkinlik Adı *</Label>
            <Input id="name" name="name" required maxLength={200} />
          </div>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Başlangıç Tarihi *</Label>
              <Input id="start_date" name="start_date" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">Bitiş Tarihi *</Label>
              <Input id="end_date" name="end_date" type="date" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="load_in_date">Kurulum Tarihi</Label>
              <Input id="load_in_date" name="load_in_date" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="load_out_date">Söküm Tarihi</Label>
              <Input id="load_out_date" name="load_out_date" type="date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="venue">Mekan</Label>
              <Input id="venue" name="venue" maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pm_id">Proje Yöneticisi</Label>
              <Select name="pm_id">
                <SelectTrigger><SelectValue placeholder="PM Ata" /></SelectTrigger>
                <SelectContent>
                  {pms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venue_address">Mekan Adresi</Label>
            <Input id="venue_address" name="venue_address" maxLength={300} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea id="notes" name="notes" rows={2} maxLength={1000} />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? "Oluşturuluyor…" : "Etkinlik Oluştur"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}