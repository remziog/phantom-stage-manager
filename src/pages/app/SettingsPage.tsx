import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateCompany } from "@/services/companies";

export default function SettingsPage() {
  const { company, refreshCompany } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!company) return;
    setName(company.name);
    setTaxId(company.tax_id ?? "");
    setCurrency(company.currency);
    setPrimaryColor(company.primary_color ?? "#4F46E5");
  }, [company]);

  const save = async () => {
    if (!company) return;
    setSaving(true);
    try {
      await updateCompany(company.id, { name, tax_id: taxId || null, currency, primary_color: primaryColor });
      await refreshCompany();
      toast({ title: "Settings saved" });
    } catch (err) {
      toast({ title: "Failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-display">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your workspace.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company profile</CardTitle>
            <CardDescription>Shown on invoices and to your team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5"><Label>Company name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Tax ID</Label><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Currency</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branding</CardTitle>
            <CardDescription>Used on invoices and customer-facing pages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Primary color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color" value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-16 rounded border border-border bg-transparent"
              />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team members</CardTitle>
            <CardDescription>Invite teammates by email — coming soon.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Invitations are on the roadmap. For now, share your workspace name and have your team sign up directly.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing</CardTitle>
            <CardDescription>Manage your plan and payment method.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">You're on the <strong>Free</strong> plan. Stripe billing coming soon.</p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </div>
    </AppShell>
  );
}
