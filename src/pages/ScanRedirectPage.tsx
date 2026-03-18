import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEquipment } from "@/hooks/useEquipment";

export default function ScanRedirectPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { data: equipment = [], isLoading } = useEquipment();

  useEffect(() => {
    if (isLoading || !code) return;

    const trimmed = code.trim().toUpperCase();
    const eq = equipment.find(
      (e) =>
        e.qr_code?.toUpperCase() === trimmed ||
        e.id.toUpperCase() === trimmed
    );

    if (eq) {
      navigate(`/equipment/${eq.id}`, { replace: true });
    } else {
      navigate(`/scanner?code=${encodeURIComponent(code)}`, { replace: true });
    }
  }, [isLoading, code, equipment, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground animate-pulse">Ekipman aranıyor…</p>
    </div>
  );
}
