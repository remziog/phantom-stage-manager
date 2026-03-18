import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface QrScannerProps {
  onScan: (code: string) => void;
  onError?: (error: string) => void;
  active?: boolean;
}

export function QrScanner({ onScan, onError, active = true }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

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
    });
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText);
        },
        () => {} // ignore scan failures
      )
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
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [active]);

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-8">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-black">
      <div ref={containerRef} className="w-full" />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
          <p className="text-sm text-muted-foreground animate-pulse">Kamera başlatılıyor…</p>
        </div>
      )}
    </div>
  );
}
