import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useCustomers, useUpdateCustomer } from "@/hooks/useCustomers";
import { useQuotes } from "@/hooks/useQuotes";
import { useCustomerPrices, useUpsertCustomerPrice, useDeleteCustomerPrice } from "@/hooks/useCustomerPrices";
import { useEquipment } from "@/hooks/useEquipment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QuoteStatusBadge } from "@/components/quotes/QuoteStatusBadge";
import { CustomerTypeBadge } from "@/components/customers/CustomerBadges";
import { ArrowLeft, Globe, Phone, Mail, MapPin, Building2, FileText, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const fmt = (v: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v);

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customers = [], isLoading } = useCustomers();
  const { data: allQuotes = [] } = useQuotes();
  const { data: prices = [] } = useCustomerPrices(id);
  const { data: equipment = [] } = useEquipment();
  const upsertPrice = useUpsertCustomerPrice();
  const deletePrice = useDeleteCustomerPrice();
  const updateCustomer = useUpdateCustomer();

  const customer = customers.find((c) => c.id === id);
  const customerQuotes = allQuotes.filter((q) => q.customer_id === id);
  const pastQuotes = customerQuotes.filter((q) => ["Approved", "Rejected", "Cancelled"].includes(q.status));
  const activeQuotes = customerQuotes.filter((q) => ["Draft", "Sent"].includes(q.status));

  // Add price form state
  const [newEquipmentId, setNewEquipmentId] = useState("");
  const [newPrice, setNewPrice] = useState("");

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-12">
          <p className="text-sm text-muted-foreground">Yükleniyor…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center p-12 gap-3">
          <p className="text-sm text-muted-foreground">Müşteri bulunamadı.</p>
          <Link to="/customers"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Geri</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  const handleAddPrice = () => {
    if (!newEquipmentId || !newPrice || !id) return;
    upsertPrice.mutate({
      customer_id: id,
      equipment_id: newEquipmentId,
      custom_price_per_day: Number(newPrice),
    });
    setNewEquipmentId("");
    setNewPrice("");
  };

  const availableEquipment = equipment.filter((eq) => !prices.some((p) => p.equipment_id === eq.id));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/customers">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground truncate">{customer.company_name}</h1>
              <CustomerTypeBadge type={customer.customer_type} />
              {customer.has_contract && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-semibold bg-primary/15 text-primary border-primary/20">
                  Sözleşmeli
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{customer.contact_name}</p>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="bg-secondary">
            <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
            <TabsTrigger value="past">Geçmiş Teklifler</TabsTrigger>
            <TabsTrigger value="active">Güncel Teklifler</TabsTrigger>
            <TabsTrigger value="invoices">Faturalar</TabsTrigger>
          </TabsList>

          {/* Tab 1: Genel Bilgiler */}
          <TabsContent value="general" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="phantom-shadow border-border/50">
                <CardHeader className="pb-3"><CardTitle className="text-sm">İletişim Bilgileri</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="E-posta" value={customer.email} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefon" value={customer.phone} />
                  <InfoRow icon={<Globe className="h-4 w-4" />} label="Web Sitesi" value={customer.website} link />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="Adres" value={[customer.address, customer.address_district, customer.city, customer.address_postal_code].filter(Boolean).join(", ")} />
                </CardContent>
              </Card>
              <Card className="phantom-shadow border-border/50">
                <CardHeader className="pb-3"><CardTitle className="text-sm">Vergi & Sözleşme</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow icon={<Building2 className="h-4 w-4" />} label="Vergi No" value={customer.tax_id} />
                  <InfoRow icon={<FileText className="h-4 w-4" />} label="Vergi Dairesi" value={customer.tax_office} />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sözleşmeli</span>
                    <Badge variant={customer.has_contract ? "default" : "secondary"}>
                      {customer.has_contract ? "Evet" : "Hayır"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Toplam Gelir</span>
                    <span className="font-semibold text-foreground">{fmt(customer.total_revenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Toplam Etkinlik</span>
                    <span className="font-semibold text-foreground">{customer.total_events}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {customer.notes && (
              <Card className="phantom-shadow border-border/50">
                <CardHeader className="pb-3"><CardTitle className="text-sm">Notlar</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.notes}</p></CardContent>
              </Card>
            )}

            {/* Özel Fiyatlar */}
            {customer.has_contract && (
              <Card className="phantom-shadow border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Özel Fiyatlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {prices.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ekipman</TableHead>
                          <TableHead className="text-right">Özel Fiyat/Gün</TableHead>
                          <TableHead className="text-right">Standart Fiyat</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prices.map((p) => {
                          const eq = equipment.find((e) => e.id === p.equipment_id);
                          return (
                            <TableRow key={p.id}>
                              <TableCell className="text-foreground">{eq?.name ?? "—"}</TableCell>
                              <TableCell className="text-right font-semibold text-primary tabular-nums">{fmt(p.custom_price_per_day)}</TableCell>
                              <TableCell className="text-right text-muted-foreground tabular-nums">{eq ? fmt(eq.gross_price_per_day) : "—"}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePrice.mutate({ id: p.id, customerId: customer.id })}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select value={newEquipmentId} onValueChange={setNewEquipmentId}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Ekipman seçin" /></SelectTrigger>
                        <SelectContent>
                          {availableEquipment.map((eq) => (
                            <SelectItem key={eq.id} value={eq.id}>{eq.name} — {fmt(eq.gross_price_per_day)}/gün</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input type="number" min={0} className="h-9 w-32 text-xs tabular-nums" placeholder="Özel fiyat ₺" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                    <Button size="sm" className="h-9" onClick={handleAddPrice} disabled={!newEquipmentId || !newPrice}>
                      <Plus className="h-4 w-4 mr-1" /> Ekle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 2: Geçmiş Teklifler */}
          <TabsContent value="past">
            <QuoteTable quotes={pastQuotes} emptyMessage="Geçmiş teklif bulunamadı." />
          </TabsContent>

          {/* Tab 3: Güncel Teklifler */}
          <TabsContent value="active">
            <QuoteTable quotes={activeQuotes} emptyMessage="Aktif teklif bulunamadı." />
          </TabsContent>

          {/* Tab 4: Faturalar */}
          <TabsContent value="invoices">
            <Card className="phantom-shadow border-border/50">
              <CardContent className="flex items-center justify-center p-12">
                <p className="text-sm text-muted-foreground">Fatura modülü yakında eklenecek.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ icon, label, value, link }: { icon: React.ReactNode; label: string; value: string | null | undefined; link?: boolean }) {
  const display = value || "—";
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground w-20 shrink-0">{label}</span>
      {link && value ? (
        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{display}</a>
      ) : (
        <span className="text-foreground truncate">{display}</span>
      )}
    </div>
  );
}

function QuoteTable({ quotes, emptyMessage }: { quotes: any[]; emptyMessage: string }) {
  if (quotes.length === 0) {
    return (
      <Card className="phantom-shadow border-border/50">
        <CardContent className="flex items-center justify-center p-12">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v);

  return (
    <Card className="phantom-shadow border-border/50">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Teklif No</TableHead>
            <TableHead>Etkinlik</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead className="text-right">Toplam</TableHead>
            <TableHead>Tarih</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((q) => (
            <TableRow key={q.id}>
              <TableCell>
                <Link to={`/quotes/${q.id}`} className="text-primary hover:underline font-medium">{q.quote_number}</Link>
              </TableCell>
              <TableCell className="text-foreground">{q.event_name}</TableCell>
              <TableCell><QuoteStatusBadge status={q.status} /></TableCell>
              <TableCell className="text-right font-medium tabular-nums text-foreground">{fmt(q.total)}</TableCell>
              <TableCell className="text-muted-foreground">{new Date(q.created_at).toLocaleDateString("tr-TR")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
