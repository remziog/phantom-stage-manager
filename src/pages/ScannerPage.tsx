import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { QrScanner } from "@/components/scanner/QrScanner";
import { useEquipment } from "@/hooks/useEquipment";
import { useEvents } from "@/hooks/useEvents";
import { useVehicles } from "@/hooks/useVehicles";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScanLine, Package, AlertTriangle, Truck, Eye, Camera, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FaultReportDialog } from "@/components/scanner/FaultReportDialog";
import { LoadingWorkflow } from "@/components/scanner/LoadingWorkflow";
import { toast } from "sonner";

const conditionColors: Record<string, string> = {
  Excellent: "text-[hsl(var(--success))]",
  Good: "text-primary",
  Fair: "text-[hsl(var(--warning))]",
  "Needs Repair": "text-destructive",
};

export default function ScannerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [activeTab, setActiveTab] = useState("view");
  const [faultDialogOpen, setFaultDialogOpen] = useState(false);

  const { data: equipment = [] } = useEquipment();
  const { user } = useAuth();

  // Handle code from URL query param (from ScanRedirectPage)
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl && equipment.length > 0) {
      setScannedCode(codeFromUrl);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, equipment]);

  const matchedEquipment = scannedCode
    ? equipment.find((eq) => {
        const code = scannedCode.trim();
        return (
          eq.qr_code === code ||
          eq.id === code ||
          eq.qr_code?.toUpperCase() === code.toUpperCase() ||
          eq.id.toUpperCase() === code.toUpperCase()
        );
      })
    : null;

  const handleScan = useCallback((code: string) => {
    const trimmed = code.trim();
    setScannedCode(trimmed);
    setScanning(false);
    const eq = equipment.find((e) => 
      e.qr_code === trimmed || 
      e.id === trimmed ||
      e.qr_code?.toUpperCase() === trimmed.toUpperCase() ||
      e.id.toUpperCase() === trimmed.toUpperCase()
    );
    if (eq) {
      toast.success(`Ekipman bulundu: ${eq.name}`);
    } else {
      toast.error("Eşleşen ekipman bulunamadı");
    }
  }, [equipment]);

  const resetScan = () => {
    setScannedCode(null);
    setActiveTab("view");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ScanLine className="h-6 w-6 text-primary" />
              QR Tarayıcı
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ekipmanları tarayın: detay görüntüleme, arıza bildirimi, yükleme/boşaltma
            </p>
          </div>
          {!scanning && (
            <Button onClick={() => { setScanning(true); resetScan(); }} className="gap-2">
              <Camera className="h-4 w-4" /> Tara
            </Button>
          )}
        </div>

        {/* Scanner */}
        {scanning && (
          <Card className="border-primary/30">
            <CardHeader className="p-3 flex-row items-center justify-between">
              <CardTitle className="text-sm">Kamerayı QR koda doğrultun</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setScanning(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <QrScanner onScan={handleScan} active={scanning} />
            </CardContent>
          </Card>
        )}

        {/* Scanned equipment info */}
        {scannedCode && !matchedEquipment && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive font-medium">Eşleşen ekipman bulunamadı</p>
              <p className="text-xs text-muted-foreground mt-1">Kod: {scannedCode}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { setScanning(true); resetScan(); }}>
                Tekrar Tara
              </Button>
            </CardContent>
          </Card>
        )}

        {matchedEquipment && (
          <div className="space-y-4">
            {/* Equipment card */}
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold text-foreground">{matchedEquipment.name}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">{matchedEquipment.category}</Badge>
                      {matchedEquipment.brand && <Badge variant="secondary">{matchedEquipment.brand}</Badge>}
                      <Badge variant="secondary" className={conditionColors[matchedEquipment.condition]}>
                        {matchedEquipment.condition}
                      </Badge>
                      <Badge variant="outline">{matchedEquipment.current_location}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">QR</p>
                    <p className="text-sm font-mono text-foreground">{matchedEquipment.qr_code}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="view" className="gap-1.5 text-xs">
                  <Eye className="h-3.5 w-3.5" /> Detay
                </TabsTrigger>
                <TabsTrigger value="fault" className="gap-1.5 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5" /> Arıza
                </TabsTrigger>
                <TabsTrigger value="load" className="gap-1.5 text-xs">
                  <Truck className="h-3.5 w-3.5" /> Yükleme
                </TabsTrigger>
              </TabsList>

              {/* View details */}
              <TabsContent value="view">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Kategori</p>
                        <p className="font-medium text-foreground">{matchedEquipment.category}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Alt Kategori</p>
                        <p className="font-medium text-foreground">{matchedEquipment.subcategory || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Marka / Model</p>
                        <p className="font-medium text-foreground">{[matchedEquipment.brand, matchedEquipment.model].filter(Boolean).join(" ") || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Seri No</p>
                        <p className="font-medium text-foreground">{matchedEquipment.serial_number || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Ağırlık</p>
                        <p className="font-medium text-foreground">{matchedEquipment.weight_kg ? `${matchedEquipment.weight_kg} kg` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Güç Tüketimi</p>
                        <p className="font-medium text-foreground">{matchedEquipment.power_consumption_watts ? `${matchedEquipment.power_consumption_watts} W` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Stok (Toplam / Müsait)</p>
                        <p className="font-medium text-foreground">{matchedEquipment.quantity_total} / {matchedEquipment.quantity_available}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Konum</p>
                        <p className="font-medium text-foreground">{matchedEquipment.current_location}</p>
                      </div>
                    </div>
                    {matchedEquipment.notes && (
                      <div>
                        <p className="text-muted-foreground text-xs">Notlar</p>
                        <p className="text-sm text-foreground">{matchedEquipment.notes}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => setFaultDialogOpen(true)} className="gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> Arıza Bildir
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setScanning(true); resetScan(); }} className="gap-1.5">
                        <ScanLine className="h-3.5 w-3.5" /> Yeni Tara
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Fault reporting */}
              <TabsContent value="fault">
                <Card>
                  <CardContent className="p-4">
                    <FaultReportDialog
                      equipment={matchedEquipment}
                      userId={user?.id || ""}
                      inline
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Loading */}
              <TabsContent value="load">
                <LoadingWorkflow
                  equipment={matchedEquipment}
                  userId={user?.id || ""}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Empty state */}
        {!scanning && !scannedCode && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12">
              <ScanLine className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Ekipman QR kodunu tarayarak bilgi görüntüleyin, arıza bildirin veya kamyona yükleyin.
              </p>
              <Button onClick={() => setScanning(true)} className="gap-2">
                <Camera className="h-4 w-4" /> Taramayı Başlat
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fault dialog (from view tab button) */}
      {matchedEquipment && (
        <FaultReportDialog
          equipment={matchedEquipment}
          userId={user?.id || ""}
          open={faultDialogOpen}
          onOpenChange={setFaultDialogOpen}
        />
      )}
    </DashboardLayout>
  );
}
