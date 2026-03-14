import { Badge } from "@/components/ui/badge";

const typeStyles: Record<string, string> = {
  Corporate: "bg-primary/15 text-primary border-primary/20",
  Agency: "bg-accent/15 text-accent border-accent/20",
  Individual: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20",
  Government: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/20",
};

export function CustomerTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className={typeStyles[type] ?? ""}>
      {type}
    </Badge>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        active
          ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/20"
          : "bg-destructive/15 text-destructive border-destructive/20"
      }
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}
