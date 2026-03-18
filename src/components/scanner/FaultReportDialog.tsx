import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCreateFault } from "@/hooks/useEquipmentFaults";
import { useEvents } from "@/hooks/useEvents";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Upload, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface FaultReportDialogProps {
  equipment: { id: string; name: string; qr_code: string | null };
  userId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  inline?: boolean;
}

const faultTypes = [
  { value: "damage", label: "Hasar" },
  { value: "malfunction", label: "Arıza / Çalışmıyor" },
  { value: "missing_parts", label: "Eksik Parça" },
  { value: "cosmetic", label: "Kozmetik Kusur" },
  { value: "other", label: "Diğer" },
];

const severities = [
  { value: "low", label: "Düşük", color: "text-muted-foreground" },
  { value: "medium", label: "Orta", color: "text-[hsl(var(--warning))]" },
  { value: "high", label: "Yüksek", color: "text-destructive" },
  { value: "critical", label: "Kritik", color: "text-destructive font-bold" },
];

export function FaultReportDialog({ equipment, userId, open, onOpenChange, inline = false }: FaultReportDialogProps) {
  const [faultType, setFaultType] = useState("damage");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [eventId, setEventId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const createFault = useCreateFault();
  const { data: events = [] } = useEvents();

  const activeEvents = events.filter((e) => e.status !== "Completed" && e.status !== "Cancelled");

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      toast.error("En fazla 5 fotoğraf yükleyebilirsiniz");
      return;
    }
    setPhotos((prev) => [...prev, ...files]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Açıklama gereklidir");
      return;
    }

    setUploading(true);
    try {
      // Upload photos
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const ext = photo.name.split(".").pop();
        const path = `${equipment.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("fault-photos").upload(path, photo);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("fault-photos").getPublicUrl(path);
        photoUrls.push(urlData.publicUrl);
      }

      await createFault.mutateAsync({
        equipment_id: equipment.id,
        reported_by: userId,
        event_id: eventId,
        fault_type: faultType,
        severity,
        description: description.trim(),
        photo_urls: photoUrls,
      });

      // Reset form
      setDescription("");
      setFaultType("damage");
      setSeverity("medium");
      setEventId(null);
      setPhotos([]);
      onOpenChange?.(false);
    } catch (err: any) {
      toast.error(err.message || "Arıza raporu oluşturulamadı");
    } finally {
      setUploading(false);
    }
  };

  const formContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
        <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
        <span className="text-sm font-medium text-foreground">{equipment.name}</span>
        {equipment.qr_code && <Badge variant="outline" className="text-xs ml-auto">{equipment.qr_code}</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Arıza Türü</Label>
          <Select value={faultType} onValueChange={setFaultType}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {faultTypes.map((ft) => <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Önem Derecesi</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {severities.map((s) => <SelectItem key={s.value} value={s.value}><span className={s.color}>{s.label}</span></SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">İlgili Etkinlik (opsiyonel)</Label>
        <Select value={eventId || "none"} onValueChange={(v) => setEventId(v === "none" ? null : v)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Etkinlik seçin" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Etkinlik yok</SelectItem>
            {activeEvents.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Açıklama *</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Arıza detaylarını yazın…"
          rows={3}
          className="text-sm"
          maxLength={1000}
        />
      </div>

      {/* Photo upload */}
      <div>
        <Label className="text-xs">Fotoğraflar (maks. 5)</Label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {photos.map((photo, i) => (
            <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
              <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removePhoto(i)} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {photos.length < 5 && (
            <label className="flex items-center justify-center w-16 h-16 rounded-md border border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors">
              <Camera className="h-5 w-5 text-muted-foreground" />
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
            </label>
          )}
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={uploading || !description.trim()} className="w-full gap-2">
        <Upload className="h-4 w-4" />
        {uploading ? "Gönderiliyor…" : "Arıza Bildir"}
      </Button>
    </div>
  );

  if (inline) return formContent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Arıza Bildirimi</DialogTitle>
          <DialogDescription>Ekipman arızasını raporlayın</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
