import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type TeamRole = Database["public"]["Enums"]["team_role"];

const roleStyles: Record<TeamRole, string> = {
  "Project Manager": "bg-primary/15 text-primary border-primary/20",
  "Light Technician": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "Sound Technician": "bg-violet-500/15 text-violet-400 border-violet-500/20",
  "Video Technician": "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  "Rigger": "bg-rose-500/15 text-rose-400 border-rose-500/20",
  "Stage Hand": "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "Driver": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "General Crew": "bg-slate-500/15 text-slate-400 border-slate-500/20",
};

export function TeamRoleBadge({ role }: { role: TeamRole }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] uppercase tracking-widest font-semibold rounded px-2 py-0.5",
        roleStyles[role]
      )}
    >
      {role}
    </Badge>
  );
}

export function AvailabilityIndicator({ available }: { available: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-xs font-medium",
      available ? "text-success" : "text-muted-foreground"
    )}>
      <span className={cn(
        "h-2 w-2 rounded-full",
        available ? "bg-success" : "bg-muted-foreground"
      )} />
      {available ? "Müsait" : "Müsait Değil"}
    </span>
  );
}