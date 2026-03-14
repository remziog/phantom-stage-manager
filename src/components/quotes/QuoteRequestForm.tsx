import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateQuoteRequest, uploadQuoteRequestFile } from "@/hooks/useQuoteRequests";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Send, Upload, X, Loader2 } from "lucide-react";

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

export function QuoteRequestForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const create = useCreateQuoteRequest();
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
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
  const [file, setFile] = useState<File | null>(null);

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
    if (!form.event_name.trim()) {
      toast({ title: "Event name is required", variant: "destructive" });
      return;
    }

    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (file && user) {
        setUploading(true);
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("quote-request-files")
          .upload(path, file);
        if (uploadError) throw uploadError;
        fileUrl = path;
        fileName = file.name;
        setUploading(false);
      }

      await create.mutateAsync({
        event_name: form.event_name,
        event_type: form.event_type,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        venue: form.venue || null,
        estimated_audience_size: form.estimated_audience_size || null,
        services_needed: form.services_needed,
        budget_range: form.budget_range || null,
        details: form.details || null,
        file_url: fileUrl,
        file_name: fileName,
      });

      toast({ title: "Quote request submitted!", description: "We'll get back to you soon." });
      setForm({
        event_name: "", event_type: "Other", start_date: "", end_date: "",
        venue: "", estimated_audience_size: "", services_needed: [],
        budget_range: "", details: "",
      });
      setFile(null);
      onSuccess?.();
    } catch (err: any) {
      setUploading(false);
      toast({ title: "Error submitting request", description: err.message, variant: "destructive" });
    }
  };

  const isSubmitting = create.isPending || uploading;

  return (
    <Card className="phantom-shadow border-border/50">
      <CardHeader>
        <CardTitle className="text-foreground">Request a Quote</CardTitle>
        <p className="text-sm text-muted-foreground">
          Tell us about your event and we'll prepare a tailored proposal.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Info */}
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
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="venue">Venue / Location</Label>
              <Input
                id="venue"
                value={form.venue}
                onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                placeholder="e.g. Zorlu Center, Istanbul"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">Estimated Audience Size</Label>
              <Input
                id="audience"
                value={form.estimated_audience_size}
                onChange={(e) => setForm((f) => ({ ...f, estimated_audience_size: e.target.value }))}
                placeholder="e.g. 5,000"
              />
            </div>
          </div>

          {/* Services */}
          <div className="space-y-3">
            <Label>Services Needed</Label>
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

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Event Brief / Technical Rider (optional)</Label>
            {file ? (
              <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/50 px-3 py-2.5">
                <Upload className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setFile(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-secondary/30 px-4 py-6 text-sm text-muted-foreground hover:bg-secondary/50 transition-colors">
                <Upload className="h-4 w-4" />
                <span>Click to upload (PDF, DOC, images — max 10 MB)</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size > 10 * 1024 * 1024) {
                      toast({ title: "File too large", description: "Maximum 10 MB", variant: "destructive" });
                      return;
                    }
                    if (f) setFile(f);
                  }}
                />
              </label>
            )}
          </div>

          <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSubmitting ? "Submitting…" : "Submit Quote Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
