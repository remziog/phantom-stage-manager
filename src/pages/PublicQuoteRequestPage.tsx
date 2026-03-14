import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Send, Loader2, CheckCircle, Zap, Music, Monitor, Construction } from "lucide-react";

const eventTypes = [
  "Concert", "Corporate Event", "Festival", "Wedding",
  "Exhibition", "Sports Event", "Conference", "Other",
];

const serviceOptions = [
  "Sound System", "Lighting", "LED Screens / Video",
  "Truss / Staging", "Power / Generator", "Crew / Technicians",
  "Transport / Logistics",
];

const budgetRanges = [
  "Under ₺100,000", "₺100,000 – ₺250,000", "₺250,000 – ₺500,000",
  "₺500,000 – ₺1,000,000", "₺1,000,000+", "Prefer not to say",
];

export default function PublicQuoteRequestPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    contact_company: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    event_name: "",
    event_type: "Other",
    start_date: "",
    end_date: "",
    venue: "",
    estimated_audience_size: "",
    services_needed: [] as string[],
    budget_range: "",
    details: "",
  });

  const toggleService = (service: string) => {
    setForm((f) => ({
      ...f,
      services_needed: f.services_needed.includes(service)
        ? f.services_needed.filter((s) => s !== service)
        : [...f.services_needed, service],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.event_name.trim() || !form.contact_name.trim() || !form.contact_email.trim()) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-quote-request", {
        body: form,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Error submitting request", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Toaster />
        <Card className="max-w-md w-full phantom-shadow border-border/50 text-center">
          <CardContent className="py-12 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-[hsl(var(--success))]" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Request Submitted!</h2>
            <p className="text-sm text-muted-foreground">
              Thank you for your interest. Our team will review your request and get back to you within 24 hours.
            </p>
            <Button variant="outline" onClick={() => { setSubmitted(false); setForm({
              contact_company: "", contact_name: "", contact_email: "", contact_phone: "",
              event_name: "", event_type: "Other", start_date: "", end_date: "", venue: "",
              estimated_audience_size: "", services_needed: [], budget_range: "", details: "",
            }); }}>
              Submit Another Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
        <div className="relative mx-auto max-w-3xl px-6 py-16 text-center">
          <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-5xl">
            PHANTOM
          </h1>
          <p className="mt-2 text-lg text-primary font-medium">Event Engineering</p>
          <p className="mt-6 text-xl text-foreground font-semibold tracking-tight">
            Professional Sound, Light & Video Solutions for Your Event
          </p>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            From intimate corporate gatherings to massive outdoor festivals, Phantom delivers 
            world-class technical production across Turkey. Tell us about your event and receive 
            a tailored proposal within 24 hours.
          </p>
          <div className="mt-8 flex justify-center gap-8 text-muted-foreground">
            <div className="flex flex-col items-center gap-1.5">
              <Music className="h-5 w-5 text-primary" />
              <span className="text-xs">Sound</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-xs">Lighting</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Monitor className="h-5 w-5 text-primary" />
              <span className="text-xs">Video</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Construction className="h-5 w-5 text-primary" />
              <span className="text-xs">Truss</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Card className="phantom-shadow border-border/50">
          <CardContent className="p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-foreground mb-1">Request a Quote</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Fill out the form below and our team will prepare a custom proposal for your event.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-primary uppercase tracking-wider">Contact Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact_company">Company Name</Label>
                    <Input
                      id="contact_company"
                      value={form.contact_company}
                      onChange={(e) => setForm((f) => ({ ...f, contact_company: e.target.value }))}
                      placeholder="e.g. Vodafone Turkey"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contact Person *</Label>
                    <Input
                      id="contact_name"
                      value={form.contact_name}
                      onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                      placeholder="Full name"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email *</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Phone Number</Label>
                    <Input
                      id="contact_phone"
                      value={form.contact_phone}
                      onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                      placeholder="+90 5xx xxx xx xx"
                    />
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-primary uppercase tracking-wider">Event Details</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="event_name">Event Name *</Label>
                    <Input
                      id="event_name"
                      value={form.event_name}
                      onChange={(e) => setForm((f) => ({ ...f, event_name: e.target.value }))}
                      placeholder="e.g. Summer Music Festival 2026"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select value={form.event_type} onValueChange={(v) => setForm((f) => ({ ...f, event_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {eventTypes.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input id="start_date" type="date" value={form.start_date}
                      onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input id="end_date" type="date" value={form.end_date}
                      onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue / Location</Label>
                    <Input id="venue" value={form.venue}
                      onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                      placeholder="e.g. Zorlu Center, Istanbul" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="audience">Estimated Audience Size</Label>
                    <Input id="audience" value={form.estimated_audience_size}
                      onChange={(e) => setForm((f) => ({ ...f, estimated_audience_size: e.target.value }))}
                      placeholder="e.g. 5,000" />
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-primary uppercase tracking-wider">Services Needed</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {serviceOptions.map((s) => (
                    <label
                      key={s}
                      className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2.5 text-sm cursor-pointer hover:bg-secondary transition-colors"
                    >
                      <Checkbox
                        checked={form.services_needed.includes(s)}
                        onCheckedChange={() => toggleService(s)}
                      />
                      <span className="text-foreground">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <Label>Budget Range (optional)</Label>
                <Select value={form.budget_range} onValueChange={(v) => setForm((f) => ({ ...f, budget_range: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select budget range" /></SelectTrigger>
                  <SelectContent>
                    {budgetRanges.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Details */}
              <div className="space-y-2">
                <Label htmlFor="details">Additional Details</Label>
                <Textarea
                  id="details"
                  value={form.details}
                  onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                  placeholder="Any specific requirements, technical riders, or special requests…"
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {loading ? "Submitting…" : "Submit Quote Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center pb-8">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Phantom Event Engineering · phantom.com.tr
          </p>
          <a href="/login" className="text-xs text-primary hover:underline mt-1 inline-block">
            Already a customer? Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
