import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useCustomers, useUpdateCustomer } from "@/hooks/useCustomers";
import { AddCustomerDrawer } from "@/components/customers/AddCustomerDrawer";
import { CustomerTypeBadge, ActiveBadge } from "@/components/customers/CustomerBadges";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, Users, Building2, TrendingUp, CalendarCheck } from "lucide-react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v);

export default function CustomersPage() {
  const { data: customers = [], isLoading } = useCustomers();
  const update = useUpdateCustomer();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = customers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.company_name.toLowerCase().includes(q) ||
          c.contact_name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") list = list.filter((c) => c.customer_type === typeFilter);
    if (statusFilter !== "all") list = list.filter((c) => (statusFilter === "active" ? c.is_active : !c.is_active));
    return list;
  }, [customers, search, typeFilter, statusFilter]);

  const totalRevenue = customers.reduce((s, c) => s + c.total_revenue, 0);
  const totalEvents = customers.reduce((s, c) => s + c.total_events, 0);
  const activeCount = customers.filter((c) => c.is_active).length;

  const stats = [
    { label: "Toplam Müşteri", value: customers.length, icon: Users, color: "text-primary" },
    { label: "Aktif", value: activeCount, icon: Building2, color: "text-[hsl(var(--success))]" },
    { label: "Toplam Gelir", value: formatCurrency(totalRevenue), icon: TrendingUp, color: "text-[hsl(var(--warning))]" },
    { label: "Toplam Etkinlik", value: totalEvents, icon: CalendarCheck, color: "text-accent" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Müşteriler</h1>
            <p className="text-sm text-muted-foreground">Müşteri ilişkilerinizi yönetin ve geliri takip edin.</p>
          </div>
          <AddCustomerDrawer />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="phantom-shadow border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-lg bg-secondary p-2.5 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-semibold text-foreground">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Müşteri ara…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tür" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Türler</SelectItem>
              {["Corporate", "Agency", "Individual", "Government"].map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Pasif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="phantom-shadow border-border/50">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <p className="text-sm text-muted-foreground">Müşteriler yükleniyor…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <p className="text-sm text-muted-foreground">Müşteri bulunamadı.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Şirket</TableHead>
                  <TableHead>İletişim</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Şehir</TableHead>
                  <TableHead className="text-right">Gelir</TableHead>
                  <TableHead className="text-center">Etkinlik</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-center">Aktif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground">{c.company_name}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-foreground">{c.contact_name}</p>
                        {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                      </div>
                    </TableCell>
                    <TableCell><CustomerTypeBadge type={c.customer_type} /></TableCell>
                    <TableCell className="text-muted-foreground">{c.city ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium text-foreground">{formatCurrency(c.total_revenue)}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{c.total_events}</TableCell>
                    <TableCell><ActiveBadge active={c.is_active} /></TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={c.is_active}
                        onCheckedChange={(val) => update.mutate({ id: c.id, is_active: val })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}