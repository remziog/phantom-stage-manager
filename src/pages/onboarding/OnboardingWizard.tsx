import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ApexLogo } from "@/components/ApexLogo";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { completeOnboarding, type IndustryType } from "@/services/companies";
import { Boxes, Warehouse, Truck, Sparkles, Wand2, CheckCircle2 } from "lucide-react";

const TRACK_OPTIONS = [
  { id: "assets", label: "Assets / Inventory" },
  { id: "reservations", label: "Reservations / Bookings" },
  { id: "deliveries", label: "Deliveries / Routes" },
  { id: "customers", label: "Customers" },
  { id: "invoices", label: "Invoices & Payments" },
  { id: "team", label: "Team & Drivers" },
] as const;

const INDUSTRIES: {
  id: IndustryType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  modules: string[];
}[] = [
  { id: "rental",    label: "Rental",      icon: Boxes,     description: "Equipment, gear, vehicles, events", modules: ["Assets", "Reservations", "Customers", "Invoices", "Reports"] },
  { id: "warehouse", label: "Warehouse",   icon: Warehouse, description: "Stock, fulfillment, distribution",  modules: ["Inventory", "Movements", "Customers", "Orders", "Reports"] },
  { id: "logistics", label: "Logistics",   icon: Truck,     description: "Deliveries, drivers, routes",        modules: ["Deliveries", "Routes", "Customers", "Invoices", "Reports"] },
  { id: "mixed",     label: "A mix",       icon: Sparkles,  description: "We do a bit of everything",          modules: ["Assets", "Reservations", "Customers", "Invoices", "Reports"] },
];

// Lightweight client-side classifier — keyword scoring across descriptors
const KEYWORDS: Record<IndustryType, string[]> = {
  rental:    ["rent", "rental", "rentals", "lease", "hire", "booking", "reservation", "equipment", "gear", "camera", "audio", "lighting", "event", "wedding", "party", "stage", "production", "tool", "tools", "bike", "scooter", "boat", "yacht"],
  warehouse: ["warehouse", "stock", "inventory", "sku", "fulfill", "fulfillment", "pick", "pack", "ship", "distribution", "wholesale", "storage", "depot", "3pl", "ecommerce", "e-commerce", "retail"],
  logistics: ["logistics", "delivery", "deliveries", "courier", "freight", "trucking", "transport", "shipping", "route", "driver", "fleet", "last mile", "last-mile", "dispatch", "haul", "cargo"],
  mixed:     [],
};

function classify(text: string): { industry: IndustryType; confidence: number; scores: Record<IndustryType, number> } {
  const lower = ` ${text.toLowerCase()} `;
  const scores: Record<IndustryType, number> = { rental: 0, warehouse: 0, logistics: 0, mixed: 0 };
  (Object.keys(KEYWORDS) as IndustryType[]).forEach((key) => {
    KEYWORDS[key].forEach((kw) => {
      if (lower.includes(` ${kw} `) || lower.includes(`${kw}s `) || lower.includes(` ${kw},`) || lower.includes(` ${kw}.`)) {
        scores[key] += kw.length > 6 ? 2 : 1;
      }
    });
  });
  const sorted = (Object.entries(scores) as [IndustryType, number][]).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const second = sorted[1]?.[1] ?? 0;
  // If top score is 0 → no signal; if second is close → mixed
  if (top[1] === 0) return { industry: "mixed", confidence: 0, scores };
  if (top[1] - second <= 1 && second > 0) return { industry: "mixed", confidence: 0.5, scores };
  const total = sorted.reduce((s, [, v]) => s + v, 0) || 1;
  return { industry: top[0], confidence: top[1] / total, scores };
}

function recommendTier(users: number): { name: string; reason: string } {
  if (users <= 1) return { name: "Free", reason: "Perfect for solo operators." };
  if (users <= 3) return { name: "Starter", reason: "Right-sized for very small teams." };
  if (users <= 10) return { name: "Growth", reason: "Most popular for growing SMBs." };
  return { name: "Pro", reason: "Built for teams with multiple locations." };
}

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { company, refreshCompany } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [description, setDescription] = useState("");
  const [detected, setDetected] = useState<{ industry: IndustryType; confidence: number } | null>(null);
  const [industry, setIndustry] = useState<IndustryType>("rental");
  const [locations, setLocations] = useState<number>(1);
  const [users, setUsers] = useState<number>(1);
  const [tracks, setTracks] = useState<string[]>(["assets", "customers"]);
  const [enabledModules, setEnabledModules] = useState<string[]>(INDUSTRIES[0].modules);
  const [modulesTouched, setModulesTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const totalSteps = 6;
  const progress = (step / totalSteps) * 100;
  const recommended = recommendTier(users);
  const selectedIndustry = useMemo(() => INDUSTRIES.find((i) => i.id === industry)!, [industry]);

  // When industry changes (and user hasn't manually edited modules yet), reset modules to the industry default.
  const handleIndustryChange = (next: IndustryType) => {
    setIndustry(next);
    if (!modulesTouched) {
      const defaults = INDUSTRIES.find((i) => i.id === next)?.modules ?? [];
      setEnabledModules(defaults);
    }
  };

  const toggleModule = (m: string) => {
    setModulesTouched(true);
    setEnabledModules((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));
  };

  const toggleTrack = (id: string) =>
    setTracks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const runDetection = () => {
    const result = classify(description);
    setDetected({ industry: result.industry, confidence: result.confidence });
    setIndustry(result.industry);
    // Reset modules to the detected industry's defaults (detection should override prior edits)
    setEnabledModules(INDUSTRIES.find((i) => i.id === result.industry)?.modules ?? []);
    setModulesTouched(false);
    // Pre-fill recommended tracks
    if (result.industry === "rental") setTracks(["assets", "reservations", "customers", "invoices"]);
    if (result.industry === "warehouse") setTracks(["assets", "customers", "invoices"]);
    if (result.industry === "logistics") setTracks(["deliveries", "customers", "invoices", "team"]);
    setStep(2);
  };

  const finish = async () => {
    if (!company) return;
    setSubmitting(true);
    try {
      await completeOnboarding(company.id, industry, {
        description, detected_industry: detected?.industry, detection_confidence: detected?.confidence,
        locations, users, tracks, enabled_modules: enabledModules, recommended_tier: recommended.name,
      });
      await refreshCompany();
      toast({ title: "Welcome aboard!", description: `Your ${selectedIndustry.label.toLowerCase()} workspace is ready.` });
      navigate("/app");
    } catch (err) {
      toast({ title: "Setup failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 gradient-hero">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <ApexLogo size="sm" />
            <span className="text-xs text-muted-foreground">Step {step} of {totalSteps}</span>
          </div>
          <Progress value={progress} className="h-1" />
        </CardHeader>
        <CardContent className="min-h-[320px]">
          {step === 1 && (
            <>
              <CardTitle className="mb-2 flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                Tell us about your business
              </CardTitle>
              <CardDescription className="mb-6">
                A sentence or two is enough. We'll detect your business type and configure the right modules.
              </CardDescription>
              <div className="space-y-2">
                <Label htmlFor="desc">What does your company do?</Label>
                <Textarea
                  id="desc"
                  rows={5}
                  placeholder="e.g. We rent out professional camera and lighting equipment to film productions in Los Angeles."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Mention things like rentals, inventory, deliveries, or the customers you serve.
                </p>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <CardTitle className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-accent" />
                We think you're a {selectedIndustry.label} business
              </CardTitle>
              <CardDescription className="mb-6">
                {detected && detected.confidence > 0
                  ? `Detected from your description with ${Math.round(detected.confidence * 100)}% confidence. Confirm or pick another.`
                  : "We couldn't tell from the description — pick the option that fits best."}
              </CardDescription>
              <RadioGroup value={industry} onValueChange={(v) => setIndustry(v as IndustryType)} className="grid gap-3">
                {INDUSTRIES.map((opt) => {
                  const isDetected = detected?.industry === opt.id && detected.confidence > 0;
                  return (
                    <Label
                      key={opt.id}
                      htmlFor={opt.id}
                      className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        industry === opt.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem id={opt.id} value={opt.id} />
                      <opt.icon className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <div className="text-sm font-medium flex items-center gap-2">
                          {opt.label}
                          {isDetected && <Badge variant="secondary" className="text-[10px]">Suggested</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                      </div>
                    </Label>
                  );
                })}
              </RadioGroup>
            </>
          )}

          {step === 3 && (
            <>
              <CardTitle className="mb-2">How many locations do you operate?</CardTitle>
              <CardDescription className="mb-6">Warehouses, branches, garages — count what makes sense.</CardDescription>
              <div className="space-y-2">
                <Label htmlFor="locations">Locations</Label>
                <Input id="locations" type="number" min={1} max={500} value={locations}
                  onChange={(e) => setLocations(Math.max(1, Number(e.target.value)))} />
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <CardTitle className="mb-2">How many team members will use Apex Cloud?</CardTitle>
              <CardDescription className="mb-6">Including you. We'll recommend the right plan.</CardDescription>
              <div className="space-y-2">
                <Label htmlFor="users">Team members</Label>
                <Input id="users" type="number" min={1} max={1000} value={users}
                  onChange={(e) => setUsers(Math.max(1, Number(e.target.value)))} />
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <CardTitle className="mb-2">What do you want to track first?</CardTitle>
              <CardDescription className="mb-6">Pick everything that's a daily pain. You can change later.</CardDescription>
              <div className="grid gap-2 sm:grid-cols-2">
                {TRACK_OPTIONS.map((opt) => (
                  <Label key={opt.id} htmlFor={`t-${opt.id}`}
                    className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${
                      tracks.includes(opt.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}>
                    <Checkbox id={`t-${opt.id}`} checked={tracks.includes(opt.id)} onCheckedChange={() => toggleTrack(opt.id)} />
                    <span className="text-sm">{opt.label}</span>
                  </Label>
                ))}
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <CardTitle className="mb-2">You're all set.</CardTitle>
              <CardDescription className="mb-6">Here's what your workspace will look like.</CardDescription>
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-5 space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-primary mb-1">Recommended plan</div>
                  <div className="text-2xl font-bold">{recommended.name}</div>
                  <p className="text-sm text-muted-foreground mt-1">{recommended.reason}</p>
                </div>
                <div className="border-t border-primary/20 pt-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Modules we'll enable</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedIndustry.modules.map((m) => (
                      <Badge key={m} variant="secondary">{m}</Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm border-t border-primary/20 pt-4">
                  <div><span className="text-muted-foreground">Industry:</span> <span className="capitalize">{industry}</span></div>
                  <div><span className="text-muted-foreground">Team:</span> {users}</div>
                  <div><span className="text-muted-foreground">Locations:</span> {locations}</div>
                  <div><span className="text-muted-foreground">Tracking:</span> {tracks.length} areas</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || submitting}>
            Back
          </Button>
          {step === 1 ? (
            <Button onClick={runDetection} disabled={description.trim().length < 5}>
              <Wand2 className="h-4 w-4 mr-2" />
              Detect business type
            </Button>
          ) : step < totalSteps ? (
            <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
          ) : (
            <Button onClick={finish} disabled={submitting}>
              {submitting ? "Setting up…" : "Enter my workspace"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
