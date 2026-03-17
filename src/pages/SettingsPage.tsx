import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { UserManagement } from "@/components/settings/UserManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Upload, Save, Loader2 } from "lucide-react";

const CURRENCIES = [
  { code: "TRY", symbol: "₺", label: "Türk Lirası (₺)" },
  { code: "USD", symbol: "$", label: "ABD Doları ($)" },
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "GBP", symbol: "£", label: "İngiliz Sterlini (£)" },
];

export default function SettingsPage() {
  const { settings, isLoading, updateSettings, isUpdating, uploadLogo } = useCompanySettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    company_name: "",
    company_email: "",
    company_phone: "",
    company_address: "",
    company_city: "",
    company_country: "",
    tax_id: "",
    default_tax_rate: 20,
    currency: "TRY",
    currency_symbol: "₺",
    notes: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name || "",
        company_email: settings.company_email || "",
        company_phone: settings.company_phone || "",
        company_address: settings.company_address || "",
        company_city: settings.company_city || "",
        company_country: settings.company_country || "",
        tax_id: settings.tax_id || "",
        default_tax_rate: settings.default_tax_rate,
        currency: settings.currency,
        currency_symbol: settings.currency_symbol,
        notes: settings.notes || "",
      });
    }
  }, [settings]);

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCurrencyChange = (code: string) => {
    const currency = CURRENCIES.find((c) => c.code === code);
    if (currency) {
      setForm((prev) => ({ ...prev, currency: currency.code, currency_symbol: currency.symbol }));
    }
  };

  const handleSave = async () => {
    await updateSettings(form);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadLogo(file);
    if (url) {
      await updateSettings({ logo_url: url });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Ayarlar</h1>
            <p className="text-sm text-muted-foreground">Şirket profilinizi ve varsayılan ayarları yönetin.</p>
          </div>
          <Button onClick={handleSave} disabled={isUpdating} size="sm">
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Değişiklikleri Kaydet
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Şirket Kimliği</CardTitle>
            <CardDescription>Markanız tekliflerde ve belgelerde görünür.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 rounded-lg">
                <AvatarImage src={settings?.logo_url || undefined} className="object-cover" />
                <AvatarFallback className="rounded-lg bg-secondary text-foreground">
                  <Building2 className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Logo Yükle
                </Button>
                <p className="text-xs text-muted-foreground">PNG, JPG maks. 2MB. Önerilen 200×200px.</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Şirket Adı</Label>
                <Input value={form.company_name} onChange={(e) => handleChange("company_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Vergi No / KDV No</Label>
                <Input value={form.tax_id} onChange={(e) => handleChange("tax_id", e.target.value)} placeholder="ör. TR1234567890" />
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input type="email" value={form.company_email} onChange={(e) => handleChange("company_email", e.target.value)} placeholder="info@sirket.com" />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input value={form.company_phone} onChange={(e) => handleChange("company_phone", e.target.value)} placeholder="+90 ..." />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adres</CardTitle>
            <CardDescription>Tekliflerde ve faturalarda kullanılır.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Sokak Adresi</Label>
              <Input value={form.company_address} onChange={(e) => handleChange("company_address", e.target.value)} placeholder="Cadde / Sokak No" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Şehir</Label>
                <Input value={form.company_city} onChange={(e) => handleChange("company_city", e.target.value)} placeholder="İstanbul" />
              </div>
              <div className="space-y-2">
                <Label>Ülke</Label>
                <Input value={form.company_country} onChange={(e) => handleChange("company_country", e.target.value)} placeholder="Türkiye" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Finansal Varsayılanlar</CardTitle>
            <CardDescription>Yeni tekliflere uygulanan varsayılan değerler.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Varsayılan KDV Oranı (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.default_tax_rate}
                  onChange={(e) => handleChange("default_tax_rate", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Para Birimi</Label>
                <Select value={form.currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ek Notlar</CardTitle>
            <CardDescription>İç notlar veya belgeler için varsayılan şartlar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="ör. varsayılan ödeme koşulları, sigorta bilgileri..."
            />
          </CardContent>
        </Card>

        <UserManagement />
      </div>
    </DashboardLayout>
  );
}