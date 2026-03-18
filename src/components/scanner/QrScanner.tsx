import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface QrScannerProps {
  onScan: (code: string) => void;
  onError?: (error: string) => void;
  active?: boolean;
  cameraDeviceId?: string;
}

export function QrScanner({ onScan, onError, active = true, cameraDeviceId }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledScanRef = useRef(false);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    setError(null);
    setStarted(false);
    handledScanRef.current = false;

    const scannerId = "qr-reader-" + Math.random().toString(36).slice(2);
    containerRef.current.id = scannerId;

    const scanner = new Html5Qrcode(scannerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.AZTEC,
        Html5QrcodeSupportedFormats.PDF_417,
      ],
      verbose: false,
    });
    scannerRef.current = scanner;

    const containerWidth = containerRef.current.clientWidth || 300;
    const qrboxSize = Math.min(Math.floor(containerWidth * 0.72), 300);

    const scanConfig = {
      fps: 15,
      qrbox: { width: qrboxSize, height: qrboxSize },
      aspectRatio: 1,
      disableFlip: false,
    };

    const onDecode = (decodedText: string) => {
      if (handledScanRef.current) return;
      handledScanRef.current = true;
      onScan(decodedText);
    };

    const startWithFallback = async () => {
      if (cameraDeviceId) {
        try {
          await scanner.start({ deviceId: { exact: cameraDeviceId } }, scanConfig, onDecode, () => {});
          return;
        } catch {
          // Fallback to default camera constraints
        }
      }

      await scanner.start({ facingMode: "environment" }, scanConfig, onDecode, () => {});
    };

    startWithFallback()
      .then(() => setStarted(true))
      .catch((err) => {
        const raw = typeof err === "string" ? err : err?.message || "";
        let msg = "Kamera açılamadı";
        if (raw.includes("NotFoundError") || raw.includes("Requested device not found")) {
          msg = "Kamera bulunamadı. Lütfen cihazınızda kamera olduğundan emin olun.";
        } else if (raw.includes("NotAllowedError") || raw.includes("Permission")) {
          msg = "Kamera erişim izni verilmedi. Lütfen tarayıcı ayarlarından izin verin.";
        } else if (raw.includes("NotReadableError")) {
          msg = "Kamera başka bir uygulama tarafından kullanılıyor.";
        }
        setError(msg);
        onError?.(msg);
      });

    return () => {
      handledScanRef.current = false;
      const activeScanner = scannerRef.current;
      scannerRef.current = null;

      if (!activeScanner) return;

      if (activeScanner.isScanning) {
        activeScanner
          .stop()
          .then(() => activeScanner.clear())
          .catch(() => {});
        return;
      }

      try {
        activeScanner.clear();
      } catch {
        // ignore cleanup errors
      }
    };
  }, [active, cameraDeviceId, onScan, onError]);

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-8">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-black" style={{ minHeight: 300 }}>
      <div ref={containerRef} className="w-full" style={{ minHeight: 300 }} />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
          <p className="text-sm text-muted-foreground animate-pulse">Kamera başlatılıyor…</p>
        </div>
      )}
    </div>
  );
}
