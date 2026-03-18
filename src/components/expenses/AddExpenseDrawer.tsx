import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateExpense, uploadReceipt } from "@/hooks/useExpenses";
import { useEvents } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

const categories = [
  "Transport",
  "Accommodation",
  "Meals",
  "Equipment Rental",
  "Venue",
  "Personnel",
  "Marketing",
  "Other",
];

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddExpenseDrawer({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { data: events = [] } = useEvents();
  const createExpense = useCreateExpense();

  const [category, setCategory] = useState("Other");
  const [eventId, setEventId] = useState<string>("none");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setCategory("Other");
    setEventId("none");
    setDescription("");
    setAmount("");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setFile(null);
  };

  const handleSubmit = async () => {
    if (!description.trim() || !amount || !user) return;

    setUploading(true);
    try {
      const tempId = crypto.randomUUID();
      let receiptUrl: string | null = null;
      let receiptName: string | null = null;

      if (file) {
        receiptUrl = await uploadReceipt(file, tempId);
        receiptName = file.name;
      }

      await createExpense.mutateAsync({
        event_id: eventId !== "none" ? eventId : null,
        category,
        description: description.trim(),
        amount: parseFloat(amount),
        receipt_url: receiptUrl,
        receipt_name: receiptName,
        notes: notes.trim() || null,
        expense_date: expenseDate,
        submitted_by: user.id,
      });

      reset();
      onOpenChange(false);
    } catch {
      toast.error("Masraf kaydedilemedi");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Yeni Masraf Ekle</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div>
            <Label>Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {categoryLabels[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Etkinlik (opsiyonel)</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Etkinlik seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Etkinlik yok</SelectItem>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Açıklama *</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Masraf açıklaması"
            />
          </div>

          <div>
            <Label>Tutar (₺) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Tarih *</Label>
            <Input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>

          <div>
            <Label>Makbuz / Fatura</Label>
            <div className="mt-1">
              <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border p-3 hover:bg-muted/50 transition-colors">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {file ? file.name : "Dosya seçin (PDF, JPG, PNG)"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          <div>
            <Label>Notlar</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ek bilgi..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!description.trim() || !amount || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Kaydediliyor…
              </>
            ) : (
              "Masrafı Kaydet"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
