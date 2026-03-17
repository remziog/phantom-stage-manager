import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useTeamMembers, useUpdateTeamMember } from "@/hooks/useTeamMembers";
import { AddTeamMemberDrawer } from "@/components/team/AddTeamMemberDrawer";
import { TeamRoleBadge, AvailabilityIndicator } from "@/components/team/TeamBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import { toast } from "sonner";

const roles = Constants.public.Enums.team_role;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount);

export default function TeamPage() {
  const { data: members, isLoading } = useTeamMembers();
  const updateMember = useUpdateTeamMember();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  const filtered = useMemo(() => {
    if (!members) return [];
    return members.filter((m) => {
      const matchesSearch = !search || m.full_name.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || m.role === roleFilter;
      const matchesAvailability = !showAvailableOnly || m.is_available;
      return matchesSearch && matchesRole && matchesAvailability;
    });
  }, [members, search, roleFilter, showAvailableOnly]);

  const toggleAvailability = async (id: string, current: boolean) => {
    try {
      await updateMember.mutateAsync({ id, is_available: !current });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-display text-foreground">Ekip</h1>
            <p className="text-sm text-muted-foreground">
              {members?.length ?? 0} ekip üyesi.{" "}
              {members?.filter((m) => m.is_available).length ?? 0} müsait.
            </p>
          </div>
          <Button onClick={() => setDrawerOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Üye Ekle
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Üye ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-input border-border" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px] bg-input border-border">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Roller</SelectItem>
              {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <Switch checked={showAvailableOnly} onCheckedChange={setShowAvailableOnly} />
            Sadece müsait
          </label>
        </div>

        {isLoading ? (
          <div className="rounded-lg bg-card p-12 phantom-shadow flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Ekip yükleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg bg-card p-12 phantom-shadow flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground">
              {members?.length === 0 ? "Henüz ekip üyesi yok." : "Filtrelere uygun üye bulunamadı."}
            </p>
            {members?.length === 0 ? (
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Yeni Üye Ekle
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => { setSearch(""); setRoleFilter("all"); setShowAvailableOnly(false); }}>
                Filtreleri Temizle
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden phantom-shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Ad</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Rol</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">İletişim</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Günlük Ücret</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Yetenekler</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Durum</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Müsait</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((member, index) => (
                    <tr
                      key={member.id}
                      className="border-b border-border last:border-0 hover:bg-[rgba(255,255,255,0.03)] transition-colors duration-200"
                      style={index % 2 === 1 ? { backgroundColor: "rgba(255,255,255,0.02)" } : {}}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{member.full_name}</td>
                      <td className="px-4 py-3"><TeamRoleBadge role={member.role} /></td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {member.email && <p className="text-xs text-muted-foreground">{member.email}</p>}
                          {member.phone && <p className="text-xs text-muted-foreground">{member.phone}</p>}
                          {!member.email && !member.phone && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-foreground">{formatCurrency(member.daily_rate)}</td>
                      <td className="px-4 py-3">
                        {member.skills && member.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {member.skills.map((skill) => (
                              <span key={skill} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><AvailabilityIndicator available={member.is_available} /></td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={member.is_available}
                          onCheckedChange={() => toggleAvailability(member.id, member.is_available)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AddTeamMemberDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </DashboardLayout>
  );
}