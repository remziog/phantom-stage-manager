import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  parseCsv,
  validateAssetHeaders,
  validateAssetRow,
  rowsToCsv,
  ASSET_REQUIRED_HEADERS,
  ASSET_OPTIONAL_HEADERS,
  type ValidatedAssetRow,
} from "@/lib/csv";
import { importAssets, type ImportProgress } from "@/services/assets";
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, Download, FileText, Loader2 } from "lucide-react";

const SAMPLE_CSV = `name,sku,category,quantity,unit_price,location,status
Shure SM58,MIC-SM58,Microphone,10,99.00,Warehouse A,available
QSC K12.2,SPK-K122,Speaker,4,899.00,Warehouse A,available
`;

export default function AssetsImportPage() {
  const { user, company } = useAuth();
  const cid = company?.id ?? "";
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [validated, setValidated] = useState<ValidatedAssetRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [allowPartial, setAllowPartial] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const headerCheck = useMemo(
    () => (headers.length ? validateAssetHeaders(headers) : null),
    [headers],
  );

  const validRows = useMemo(() => validated.filter((r) => r.errors.length === 0), [validated]);
  const invalidRows = useMemo(() => validated.filter((r) => r.errors.length > 0), [validated]);

  const importMut = useMutation({
    mutationFn: () =>
      importAssets(
        cid,
        user!.id,
        validRows.map((r) => r.parsed),
        (p) => setProgress(p),
      ),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["assets", cid] });
      const skipped = invalidRows.length;
      const partial = res.failed.length > 0 ? `, ${res.failed.length} failed` : "";
      toast({
        title: "Import complete",
        description: `${res.inserted} added, ${res.updated} updated${
          skipped ? `, ${skipped} skipped` : ""
        }${partial}.`,
      });
      if (res.failed.length === 0) navigate("/app/assets");
    },
    onError: (e) => {
      setProgress(null);
      toast({ title: "Import failed", description: (e as Error).message, variant: "destructive" });
    },
  });

  const isImporting = importMut.isPending;

  // Block browser nav (refresh / close tab) while a batch is in-flight.
  useEffect(() => {
    if (!isImporting) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isImporting]);

  const canImport =
    !!cid &&
    !!user &&
    headerCheck?.ok === true &&
    validated.length > 0 &&
    (invalidRows.length === 0 || allowPartial) &&
    !isImporting;

  const handleFile = async (file: File) => {
    setParseError(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      setRawText(text);
      const { headers: hs, rows } = parseCsv(text);
      setHeaders(hs);
      const v = rows.map((r, idx) => validateAssetRow(r, idx + 2)); // +2: header is line 1
      setValidated(v);
    } catch (e) {
      setParseError((e as Error).message);
      setHeaders([]);
      setValidated([]);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "assets-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSkipped = () => {
    if (invalidRows.length === 0 || headers.length === 0) return;
    const csv = rowsToCsv(
      [...headers, "_errors"],
      invalidRows.map((r) => ({
        ...r.raw,
        _errors: r.errors.map((e) => `${e.field}: ${e.message}`).join(" | "),
      })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "assets-skipped-rows.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFileName(null);
    setRawText("");
    setHeaders([]);
    setValidated([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
              <Link to="/app/assets"><ArrowLeft className="h-4 w-4 mr-1" />Back to assets</Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-display">Import assets from CSV</h1>
            <p className="text-sm text-muted-foreground">
              Upload a CSV to bulk-add equipment. Rows with a matching SKU will be updated.
            </p>
          </div>
          <Button variant="outline" onClick={downloadSample}>
            <Download className="h-4 w-4 mr-2" />Download sample
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">CSV format</CardTitle>
            <CardDescription>
              Required column:{" "}
              {ASSET_REQUIRED_HEADERS.map((h) => (
                <Badge key={h} variant="secondary" className="mr-1">{h}</Badge>
              ))}
              <br />
              Optional:{" "}
              {ASSET_OPTIONAL_HEADERS.map((h) => (
                <Badge key={h} variant="outline" className="mr-1">{h}</Badge>
              ))}
            </CardDescription>
          </CardHeader>
        </Card>

        {!fileName ? (
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card/50 p-12 text-center cursor-pointer hover:bg-card transition"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm font-medium">Click to choose a CSV, or drag &amp; drop</div>
            <div className="text-xs text-muted-foreground">UTF-8 encoded, comma-separated</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </label>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{fileName}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  ({(new Blob([rawText]).size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} disabled={isImporting}>Choose another file</Button>
            </CardHeader>
          </Card>
        )}

        {parseError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Could not parse CSV</AlertTitle>
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        )}

        {headerCheck && !headerCheck.ok && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Missing required column(s)</AlertTitle>
            <AlertDescription>
              Add the following header{headerCheck.missing.length > 1 ? "s" : ""} to your CSV:{" "}
              <strong>{headerCheck.missing.join(", ")}</strong>.
            </AlertDescription>
          </Alert>
        )}

        {headerCheck?.ok && headerCheck.unknown.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unknown column(s) will be ignored</AlertTitle>
            <AlertDescription>{headerCheck.unknown.join(", ")}</AlertDescription>
          </Alert>
        )}

        {validated.length > 0 && headerCheck?.ok && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Total rows</div>
                  <div className="text-2xl font-semibold tabular-nums">{validated.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />Valid
                  </div>
                  <div className="text-2xl font-semibold tabular-nums text-success">{validRows.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-destructive" />With errors
                  </div>
                  <div className="text-2xl font-semibold tabular-nums text-destructive">{invalidRows.length}</div>
                </CardContent>
              </Card>
            </div>

            {invalidRows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Row errors</CardTitle>
                  <CardDescription>
                    Fix these in your CSV and re-upload, or enable “Import valid rows only”.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Line</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invalidRows.slice(0, 100).map((r) => (
                        <TableRow key={r.lineNumber}>
                          <TableCell className="tabular-nums text-muted-foreground">{r.lineNumber}</TableCell>
                          <TableCell className="font-medium">{r.parsed.name || <span className="text-muted-foreground italic">—</span>}</TableCell>
                          <TableCell className="text-muted-foreground">{r.parsed.sku || "—"}</TableCell>
                          <TableCell>
                            <ul className="space-y-0.5 text-sm text-destructive">
                              {r.errors.map((e, i) => (
                                <li key={i}><strong>{e.field}:</strong> {e.message}</li>
                              ))}
                            </ul>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {invalidRows.length > 100 && (
                    <div className="px-4 py-3 text-xs text-muted-foreground border-t">
                      Showing first 100 of {invalidRows.length} rows with errors.
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-t">
                    <div className="flex items-center gap-2">
                      <Switch id="partial" checked={allowPartial} onCheckedChange={setAllowPartial} disabled={isImporting} />
                      <Label htmlFor="partial" className="cursor-pointer">
                        Import valid rows only ({validRows.length})
                      </Label>
                    </div>
                    <Button variant="outline" size="sm" onClick={downloadSkipped}>
                      <Download className="h-4 w-4 mr-2" />Download skipped rows
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {validRows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview ({validRows.length} valid row{validRows.length === 1 ? "" : "s"})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Line</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit price</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validRows.slice(0, 20).map((r) => (
                        <TableRow key={r.lineNumber}>
                          <TableCell className="tabular-nums text-muted-foreground">{r.lineNumber}</TableCell>
                          <TableCell className="font-medium">{r.parsed.name}</TableCell>
                          <TableCell className="text-muted-foreground">{r.parsed.sku || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{r.parsed.category || "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.parsed.quantity}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.parsed.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-muted-foreground">{r.parsed.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {validRows.length > 20 && (
                    <div className="px-4 py-3 text-xs text-muted-foreground border-t">
                      Showing first 20 of {validRows.length} valid rows.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {isImporting && progress && (
              <Card aria-live="polite" aria-busy="true">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <div>
                        <div className="text-sm font-medium">
                          {progress.phase === "preparing"
                            ? "Preparing import…"
                            : progress.phase === "done"
                              ? "Finishing up…"
                              : `Importing row ${progress.processed} of ${progress.total}…`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Please keep this tab open until the import finishes.
                        </div>
                      </div>
                    </div>
                    <div className="text-sm tabular-nums text-muted-foreground">
                      {progress.total > 0
                        ? `${Math.round((progress.processed / progress.total) * 100)}%`
                        : "0%"}
                    </div>
                  </div>

                  <Progress
                    value={
                      progress.total > 0 ? (progress.processed / progress.total) * 100 : 0
                    }
                    aria-label="Import progress"
                  />

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-md border border-border bg-card/50 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Added</div>
                      <div className="text-lg font-semibold tabular-nums text-success">
                        {progress.inserted}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-card/50 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Updated</div>
                      <div className="text-lg font-semibold tabular-nums text-primary">
                        {progress.updated}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-card/50 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Failed</div>
                      <div
                        className={`text-lg font-semibold tabular-nums ${
                          progress.failed > 0 ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {progress.failed}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate("/app/assets")}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button disabled={!canImport} onClick={() => importMut.mutate()}>
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {progress
                      ? `Importing ${progress.processed}/${progress.total}…`
                      : "Importing…"}
                  </>
                ) : (
                  `Import ${validRows.length} row${validRows.length === 1 ? "" : "s"}`
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
