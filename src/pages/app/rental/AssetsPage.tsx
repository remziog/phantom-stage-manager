import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { listAssets, createAsset, updateAsset, archiveAsset, type AssetStatus } from "@/services/assets";
import { Plus, Search, Archive, Upload } from "lucide-react";
import { PermissionGate } from "@/components/PermissionGate";

const STATUS_LABELS: Record<AssetStatus, string> = {
  available: "Available", rented: "Rented", in_maintenance: "Maintenance", sold: "Sold", archived: "Archived",
};

const STATUS_TONE: Record<AssetStatus, string> = {
  available: "bg-success/15 text-success",
  rented: "bg-primary/15 text-primary",
  in_maintenance: "bg-warning/15 text-warning",
  sold: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
};

export default function AssetsPage() {
  const { user, company } = useAuth();
  const cid = company?.id ?? "";
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AssetStatus>("all");
  const [open, setOpen] = useState(false);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets", cid], queryFn: () => listAssets(cid), enabled: !!cid,
  });

  const createMut = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets", cid] });
      toast({ title: "Asset added" });
      setOpen(false);
    },
    onError: (e) => toast({ title: "Failed", description: (e as Error).message, variant: "destructive" }),
  });

  const archiveMut = useMutation({
    mutationFn: archiveAsset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets", cid] });
      toast({ title: "Asset archived" });
    },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AssetStatus }) => updateAsset(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets", cid] }),
  });

  const filtered = assets.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (filter && !`${a.name} ${a.sku ?? ""} ${a.category ?? ""}`.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !cid) return;
    const form = new FormData(e.currentTarget);
    createMut.mutate({
      company_id: cid,
      created_by: user.id,
      name: String(form.get("name")),
      sku: String(form.get("sku") || "") || null,
      category: String(form.get("category") || "") || null,
      location: String(form.get("location") || "") || null,
      quantity: Number(form.get("quantity") || 1),
      unit_price: Number(form.get("unit_price") || 0),
      status: "available",
    });
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-display">Assets</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} of {assets.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <PermissionGate permission="manage:assets">
              <Button variant="outline" asChild>
                <Link to="/app/assets/import"><Upload className="h-4 w-4 mr-2" />Import CSV</Link>
              </Button>
            </PermissionGate>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <PermissionGate permission="manage:assets">
                  <Button><Plus className="h-4 w-4 mr-2" />New asset</Button>
                </PermissionGate>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add asset</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div className="space-y-1.5"><Label>Name</Label><Input name="name" required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>SKU</Label><Input name="sku" /></div>
                    <div className="space-y-1.5"><Label>Category</Label><Input name="category" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5"><Label>Quantity</Label><Input name="quantity" type="number" min={1} defaultValue={1} /></div>
                    <div className="space-y-1.5"><Label>Unit price</Label><Input name="unit_price" type="number" step="0.01" min={0} defaultValue={0} /></div>
                    <div className="space-y-1.5"><Label>Location</Label><Input name="location" /></div>
                  </div>
                  <DialogFooter><Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search assets…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | AssetStatus)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(STATUS_LABELS) as AssetStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">No assets yet.</TableCell></TableRow>
                ) : filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-muted-foreground">{a.sku || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{a.category || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(a.unit_price).toFixed(2)}</TableCell>
                    <TableCell>
                      <Select value={a.status} onValueChange={(v) => statusMut.mutate({ id: a.id, status: v as AssetStatus })}>
                        <SelectTrigger className={`w-36 h-7 text-xs ${STATUS_TONE[a.status]}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_LABELS) as AssetStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      {a.status !== "archived" && (
                        <Button variant="ghost" size="icon" onClick={() => archiveMut.mutate(a.id)} aria-label="Archive">
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
