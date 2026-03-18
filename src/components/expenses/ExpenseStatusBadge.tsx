import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle } from "lucide-react";

const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  pending: { label: "Beklemede", variant: "outline", icon: Clock },
  approved: { label: "Onaylandı", variant: "default", icon: CheckCircle },
  rejected: { label: "Reddedildi", variant: "destructive", icon: XCircle },
};

export function ExpenseStatusBadge({ status }: { status: string }) {
  const c = config[status] ?? config.pending;
  const Icon = c.icon;
  return (
    <Badge variant={c.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

const categoryLabels: Record<string, string> = {
  Transport: "Ulaşım",
  Accommodation: "Konaklama",
  Meals: "Yemek",
  "Equipment Rental": "Ekipman Kiralama",
  Venue: "Mekan",
  Personnel: "Personel",
  Marketing: "Pazarlama",
  Other: "Diğer",
};

export function ExpenseCategoryBadge({ category }: { category: string }) {
  return (
    <Badge variant="secondary">{categoryLabels[category] ?? category}</Badge>
  );
}
