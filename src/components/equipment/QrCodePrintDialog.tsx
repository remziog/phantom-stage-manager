import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, QrCode, CheckSquare, Square } from "lucide-react";
import type { Equipment } from "@/hooks/useEquipment";

interface QrCodePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment[];
  preSelected?: string[];
}

type LabelSize = "small" | "medium" | "large";

const labelSizes: Record<LabelSize, { qr: number; width: string; label: string }> = {
  small: { qr: 80, width: "45mm", label: "Küçük (45mm)" },
  medium: { qr: 120, width: "62mm", label: "Orta (62mm)" },
  large: { qr: 160, width: "80mm", label: "Büyük (80mm)" },
};

export function QrCodePrintDialog({
  open,
  onOpenChange,
  equipment,
  preSelected,
}: QrCodePrintDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(preSelected ?? equipment.map((e) => e.id))
  );
  const [labelSize, setLabelSize] = useState<LabelSize>("medium");
  const printRef = useRef<HTMLDivElement>(null);

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === equipment.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(equipment.map((e) => e.id)));
    }
  };

  const selectedEquipment = equipment.filter((e) => selected.has(e.id));
  const size = labelSizes[labelSize];

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    // Clone and serialize SVGs to ensure they render in the print window
    const clone = printContent.cloneNode(true) as HTMLElement;
    
    // Convert all SVG elements to have explicit xmlns for standalone rendering
    clone.querySelectorAll("svg").forEach((svg) => {
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Kod Etiketleri</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; }
          @page { margin: 5mm; }
          .labels-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 4mm;
          }
          .label {
            width: ${size.width};
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 3mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            page-break-inside: avoid;
          }
          .label svg { margin-bottom: 2mm; display: block; }
          .qr-code { font-family: 'Courier New', monospace; font-size: 10px; font-weight: bold; margin-bottom: 1mm; }
          .eq-name { font-size: 9px; text-align: center; color: #333; margin-bottom: 1mm; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .eq-meta { font-size: 7px; color: #888; text-align: center; }
          @media print {
            .label { border: 1px solid #ccc; }
          }
        </style>
      </head>
      <body>
        ${clone.innerHTML}
        <script>window.onload = function() { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            QR Kod Etiketleri Yazdır
          </DialogTitle>
        </DialogHeader>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={toggleAll} className="gap-1.5">
            {selected.size === equipment.length ? (
              <CheckSquare className="h-3.5 w-3.5" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            {selected.size === equipment.length ? "Hiçbirini Seçme" : "Tümünü Seç"}
          </Button>
          <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(labelSizes).map(([key, val]) => (
                <SelectItem key={key} value={key}>
                  {val.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary">{selected.size} seçili</Badge>
          <Button
            onClick={handlePrint}
            disabled={selected.size === 0}
            size="sm"
            className="ml-auto gap-1.5"
          >
            <Printer className="h-4 w-4" />
            Yazdır
          </Button>
        </div>

        {/* Equipment selection list */}
        <div className="flex-1 overflow-y-auto border border-border rounded-md divide-y divide-border">
          {equipment.map((eq) => (
            <label
              key={eq.id}
              className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={selected.has(eq.id)}
                onCheckedChange={() => toggleItem(eq.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{eq.name}</p>
                <p className="text-xs text-muted-foreground">
                  {eq.qr_code} · {eq.category}
                  {eq.brand ? ` · ${eq.brand}` : ""}
                </p>
              </div>
              <div className="shrink-0">
                <QRCodeSVG value={eq.qr_code || eq.id} size={32} />
              </div>
            </label>
          ))}
        </div>

        {/* Print preview (hidden, used for print content) */}
        <div className="sr-only">
          <div ref={printRef}>
            <div className="labels-grid">
              {selectedEquipment.map((eq) => (
                <div key={eq.id} className="label">
                  <QRCodeSVG
                    value={eq.qr_code || eq.id}
                    size={size.qr}
                    level="M"
                    includeMargin={false}
                  />
                  <div className="qr-code">{eq.qr_code}</div>
                  <div className="eq-name">{eq.name}</div>
                  <div className="eq-meta">
                    {eq.category}
                    {eq.brand ? ` · ${eq.brand}` : ""}
                    {eq.model ? ` ${eq.model}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
