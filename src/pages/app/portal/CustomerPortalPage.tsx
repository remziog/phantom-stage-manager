/**
 * Customer Portal — read-only view of the linked customer profile plus a
 * form to request edits. Customers can't edit their record directly; they
 * submit a request that admins approve in the back office. Each row in
 * the form has a "Request change" toggle so partial updates are easy.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  fetchLinkedCustomer,
  listMyUpdateRequests,
  createUpdateRequest,
  type UpdateRequest,
} from "@/services/customerPortal";
import { Clock, CheckCircle2, XCircle, UserCircle2, Send } from "lucide-react";

type EditableField = "name" | "email" | "phone" | "address" | "tax_id" | "notes";

const FIELD_LABELS: Record<EditableField, string> = {
  name: "Company name",
  email: "Email",
  phone: "Phone",
  address: "Address",
  tax_id: "Tax ID",
  notes: "Notes",
};

const STATUS_BADGE: Record<UpdateRequest["status"], { label: string; tone: string; icon: typeof Clock }> = {
  pending: { label: "Pending review", tone: "bg-warning/15 text-warning", icon: Clock },
  approved: { label: "Approved", tone: "bg-success/15 text-success", icon: CheckCircle2 },
  rejected: { label: "Rejected", tone: "bg-destructive/15 text-destructive", icon: XCircle },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function CustomerPortalPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const customerId = profile?.linked_customer_id ?? null;

  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ["portal-customer", customerId],
    queryFn: () => fetchLinkedCustomer(customerId!),
    enabled: !!customerId,
  });

  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ["portal-requests", customerId],
    queryFn: () => listMyUpdateRequests(customerId!),
    enabled: !!customerId,
  });

  // Track which fields the user is requesting to change + the new values.
  const [editing, setEditing] = useState<Record<EditableField, boolean>>({
    name: false, email: false, phone: false, address: false, tax_id: false, notes: false,
  });
  const [values, setValues] = useState<Record<EditableField, string>>({
    name: "", email: "", phone: "", address: "", tax_id: "", notes: "",
  });
  const [message, setMessage] = useState("");

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!user || !customer) throw new Error("Missing user/customer");
      const payload: Parameters<typeof createUpdateRequest>[0] = {
        company_id: customer.company_id,
        customer_id: customer.id,
        requested_by: user.id,
        message: message.trim() || null,
      };
      // Only include fields the user explicitly toggled on.
      (Object.keys(editing) as EditableField[]).forEach((key) => {
        if (editing[key]) (payload as Record<string, unknown>)[key] = values[key].trim() || null;
      });
      return createUpdateRequest(payload);
    },
    onSuccess: () => {
      toast({ title: "Request submitted", description: "An admin will review your changes shortly." });
      setEditing({ name: false, email: false, phone: false, address: false, tax_id: false, notes: false });
      setValues({ name: "", email: "", phone: "", address: "", tax_id: "", notes: "" });
      setMessage("");
      qc.invalidateQueries({ queryKey: ["portal-requests", customerId] });
    },
    onError: (e: Error) => toast({ title: "Could not submit request", description: e.message, variant: "destructive" }),
  });

  const hasAnyEdit = useMemo(
    () => (Object.keys(editing) as EditableField[]).some((k) => editing[k]),
    [editing],
  );

  const toggleField = (key: EditableField) => {
    setEditing((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Pre-fill the input with the current value so users can tweak it.
      if (next[key] && customer) {
        setValues((v) => ({ ...v, [key]: (customer[key] as string | null) ?? "" }));
      }
      return next;
    });
  };

  // Customer not linked yet — show a clear empty state.
  if (!customerId) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Customer portal</CardTitle>
              <CardDescription>Your account isn't linked to a customer profile yet.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ask the company you work with to link your account to your customer profile.
                Once linked, you'll be able to view your details and request updates here.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold tracking-display">My profile</h1>
          <p className="text-sm text-muted-foreground">
            View your customer details and request updates. Changes are reviewed by an admin before being applied.
          </p>
        </div>

        {/* Current profile (read-only) */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
              <UserCircle2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{customer?.name ?? "—"}</CardTitle>
              <CardDescription>Your details on file</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loadingCustomer ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {(Object.keys(FIELD_LABELS) as EditableField[]).map((key) => (
                  <div key={key} className="space-y-0.5">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{FIELD_LABELS[key]}</dt>
                    <dd className="text-foreground break-words">
                      {(customer?.[key] as string | null) || <span className="text-muted-foreground">—</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Request updates */}
        <Card>
          <CardHeader>
            <CardTitle>Request updates</CardTitle>
            <CardDescription>
              Toggle the fields you'd like to change, enter the new value, and submit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(Object.keys(FIELD_LABELS) as EditableField[]).map((key) => (
              <div
                key={key}
                className={`rounded-md border p-3 transition-colors ${
                  editing[key] ? "border-primary/40 bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Label className="text-sm font-medium">{FIELD_LABELS[key]}</Label>
                    <p className="text-xs text-muted-foreground truncate">
                      Current: {(customer?.[key] as string | null) || "—"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={editing[key] ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => toggleField(key)}
                  >
                    {editing[key] ? "Cancel" : "Request change"}
                  </Button>
                </div>
                {editing[key] && (
                  <div className="mt-3">
                    {key === "notes" || key === "address" ? (
                      <Textarea
                        rows={3}
                        value={values[key]}
                        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                        placeholder={`New ${FIELD_LABELS[key].toLowerCase()}`}
                      />
                    ) : (
                      <Input
                        value={values[key]}
                        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                        placeholder={`New ${FIELD_LABELS[key].toLowerCase()}`}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="message">Message to admin (optional)</Label>
              <Textarea
                id="message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add any context for your request…"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => submitMut.mutate()}
                disabled={!hasAnyEdit || submitMut.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {submitMut.isPending ? "Submitting…" : "Submit request"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle>Request history</CardTitle>
            <CardDescription>Your past update requests and their status.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRequests ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No requests yet.</p>
            ) : (
              <ul className="space-y-3">
                {requests.map((r) => {
                  const meta = STATUS_BADGE[r.status];
                  const Icon = meta.icon;
                  const changedFields = (Object.keys(FIELD_LABELS) as EditableField[])
                    .filter((k) => r[k] !== null && r[k] !== undefined);
                  return (
                    <li key={r.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <Badge className={`${meta.tone} gap-1`}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(r.created_at)}
                        </span>
                      </div>
                      {changedFields.length > 0 ? (
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {changedFields.map((k) => (
                            <div key={k}>
                              <dt className="text-xs text-muted-foreground">{FIELD_LABELS[k]}</dt>
                              <dd className="text-foreground break-words">{r[k] as string}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="text-sm text-muted-foreground">No fields changed.</p>
                      )}
                      {r.message && (
                        <p className="mt-2 text-sm text-muted-foreground italic">"{r.message}"</p>
                      )}
                      {r.review_notes && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Admin note: {r.review_notes}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
