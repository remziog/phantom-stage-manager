import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ApexLogo } from "@/components/ApexLogo";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { completeOnboarding, type IndustryType } from "@/services/companies";
import { Boxes, Warehouse, Truck, Sparkles } from "lucide-react";

const TRACK_OPTIONS = [
  { id: "assets", label: "Assets / Inventory" },
  { id: "reservations", label: "Reservations / Bookings" },
  { id: "deliveries", label: "Deliveries / Routes" },
  { id: "customers", label: "Customers" },
  { id: "invoices", label: "Invoices & Payments" },
  { id: "team", label: "Team & Drivers" },
] as const;

const INDUSTRIES: { id: IndustryType; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: "rental",    label: "Rental",      icon: Boxes,     description: "Equipment, gear, vehicles, events" },
  { id: "warehouse", label: "Warehouse",   icon: Warehouse, description: "Stock, fulfillment, distribution" },
  { id: "logistics", label: "Logistics",   icon: Truck,     description: "Deliveries, drivers, routes" },
  { id: "mixed",     label: "A mix",       icon: Sparkles,  description: "We do a bit of everything" },
];

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
  const [industry, setIndustry] = useState<IndustryType>("rental");
  const [locations, setLocations] = useState<number>(1);
  const [users, setUsers] = useState<number>(1);
  const [tracks, setTracks] = useState<string[]>(["assets", "customers"]);
  const [submitting, setSubmitting] = useState(false);

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;
  const recommended = recommendTier(users);

  const toggleTrack = (id: string) =>
    setTracks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const finish = async () => {
    if (!company) return;
    setSubmitting(true);
    try {
      await completeOnboarding(company.id, industry, { locations, users, tracks, recommended_tier: recommended.name });
      await refreshCompany();
      toast({ title: "Welcome aboard!", description: "Your workspace is ready." });
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
        <CardContent className="min-h-[280px]">
          {step === 1 && (
            <>
              <CardTitle className="mb-2">What does your company do?</CardTitle>
              <CardDescription className="mb-6">We'll tailor your dashboard to your business.</CardDescription>
              <RadioGroup value={industry} onValueChange={(v) => setIndustry(v as IndustryType)} className="grid gap-3">
                {INDUSTRIES.map((opt) => (
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
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.description}</div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </>
          )}

          {step === 2 && (
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

          {step === 3 && (
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

          {step === 4 && (
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

          {step === 5 && (
            <>
              <CardTitle className="mb-2">You're all set.</CardTitle>
              <CardDescription className="mb-6">Here's our recommendation based on your answers.</CardDescription>
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-5">
                <div className="text-xs uppercase tracking-wider text-primary mb-1">Recommended plan</div>
                <div className="text-2xl font-bold">{recommended.name}</div>
                <p className="text-sm text-muted-foreground mt-1">{recommended.reason}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
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
          {step < totalSteps ? (
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
