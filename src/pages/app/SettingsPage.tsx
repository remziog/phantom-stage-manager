import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { updateCompany } from "@/services/companies";
import { supabase } from "@/integrations/supabase/client";
import { getEnabledModules, INDUSTRY_DEFAULT_MODULES } from "@/lib/modules";
import { listModuleChanges, logModuleChanges, type ModuleLogEntry } from "@/services/moduleLog";
import type { Database } from "@/integrations/supabase/types";
import { History, ShieldCheck } from "lucide-react";

type MemberRole = Database["public"]["Enums"]["member_role"];

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  operator: "Operator",
  viewer: "Viewer",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function SettingsPage() {
  const { user, company, refreshCompany } = useAuth();
  const { toast } = useToast();

  // Company profile fields
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [saving, setSaving] = useState(false);

  // Role + modules
  const [role, setRole] = useState<MemberRole | null>(null);
  const [modules, setModules] = useState<string[]>([]);
  const [savingModules, setSavingModules] = useState(false);

  // Audit log
  const [logEntries, setLogEntries] = useState<ModuleLogEntry[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);

  const isAdmin = role === "owner" || role === "admin";

  useEffect(() => {
    if (!company) return;
    setName(company.name);
    setTaxId(company.tax_id ?? "");
    setCurrency(company.currency);
    setPrimaryColor(company.primary_color ?? "#4F46E5");
    setModules(getEnabledModules(company.settings, company.industry_type));
  }, [company]);

  // Load the current user's role within this company
  useEffect(() => {
    let cancelled = false;
    async function loadRole() {
      if (!user || !company) return;
      const { data } = await supabase
        .from("company_members")
        .select("role")
        .eq("company_id", company.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setRole((data?.role as MemberRole) ?? null);
    }
    loadRole();
    return () => { cancelled = true; };
  }, [user, company]);

  // Load the change log (only readable by admins per RLS, so skip the call otherwise)
  useEffect(() => {
    let cancelled = false;
    async function loadLog() {
      if (!company || !isAdmin) return;
      setLoadingLog(true);
      try {
        const entries = await listModuleChanges(company.id);
        if (!cancelled) setLogEntries(entries);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoadingLog(false);
      }
    }
    loadLog();
    return () => { cancelled = true; };
  }, [company, isAdmin]);

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

  // Available modules for this industry — what the user *could* enable.
  const availableModules = company
    ? INDUSTRY_DEFAULT_MODULES[company.industry_type ?? "rental"]
    : [];

  const toggleModule = (m: string) => {
    setModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const saveModules = async () => {
    if (!company || !user) return;
    if (modules.length === 0) {
      toast({ title: "Pick at least one module", variant: "destructive" });
      return;
    }
    setSavingModules(true);
    try {
      const before = getEnabledModules(company.settings, company.industry_type);
      const nextSettings = {
        ...((company.settings as Record<string, unknown>) ?? {}),
        enabled_modules: modules,
      };
      await updateCompany(company.id, { settings: nextSettings as never });
      await logModuleChanges({
        companyId: company.id,
        userId: user.id,
        userEmail: user.email ?? null,
        before,
        after: modules,
        source: "settings",
      });
      await refreshCompany();
      // Refresh the log view immediately
      if (isAdmin) {
        const entries = await listModuleChanges(company.id);
        setLogEntries(entries);
      }
      toast({ title: "Modules updated" });
    } catch (err) {
      toast({ title: "Failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSavingModules(false);
    }
  };

  const modulesDirty = company
    ? JSON.stringify([...modules].sort()) !==
      JSON.stringify([...getEnabledModules(company.settings, company.industry_type)].sort())
    : false;

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
            <CardTitle className="text-base flex items-center gap-2">
              Enabled modules
              {role && <Badge variant="outline" className="text-[10px]">{ROLE_LABELS[role]}</Badge>}
            </CardTitle>
            <CardDescription>
              Toggle the modules visible in your sidebar. Changes are recorded in the change log.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {availableModules.map((m) => {
                const on = modules.includes(m);
                return (
                  <Label
                    key={m}
                    htmlFor={`set-mod-${m}`}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-md border cursor-pointer transition-colors ${
                      on ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox id={`set-mod-${m}`} checked={on} onCheckedChange={() => toggleModule(m)} />
                    <span className={`text-sm ${on ? "" : "text-muted-foreground line-through"}`}>{m}</span>
                  </Label>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={saveModules} disabled={!modulesDirty || savingModules}>
                {savingModules ? "Saving…" : "Save modules"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Module change log
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Visible to owners and admins only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLog ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : logEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {logEntries.map((entry) => (
                    <li key={entry.id} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={entry.action === "enabled" ? "default" : "secondary"}
                            className="text-[10px] capitalize"
                          >
                            {entry.action}
                          </Badge>
                          <span className="font-medium">{entry.module}</span>
                          <span className="text-xs text-muted-foreground capitalize">via {entry.source}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {entry.user_email ?? "Unknown user"}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(entry.created_at)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

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
