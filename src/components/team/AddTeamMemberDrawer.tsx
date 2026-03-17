import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTeamMember } from "@/hooks/useTeamMembers";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { X } from "lucide-react";

type TeamRole = Database["public"]["Enums"]["team_role"];
const roles = Constants.public.Enums.team_role;

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }

export function AddTeamMemberDrawer({ open, onOpenChange }: Props) {
  const createMember = useCreateTeamMember();
  const [form, setForm] = useState({
    full_name: "", role: "General Crew" as TeamRole, phone: "", email: "",
    daily_rate: 0, skills: [] as string[], notes: "",
  });
  const [skillInput, setSkillInput] = useState("");

  const update = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) { update("skills", [...form.skills, s]); setSkillInput(""); }
  };

  const removeSkill = (skill: string) => update("skills", form.skills.filter((s) => s !== skill));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMember.mutateAsync({
        full_name: form.full_name, role: form.role, phone: form.phone || null,
        email: form.email || null, daily_rate: form.daily_rate,
        skills: form.skills.length > 0 ? form.skills : null, notes: form.notes || null,
      });
      toast.success("Ekip üyesi eklendi");
      onOpenChange(false);
      setForm({ full_name: "", role: "General Crew", phone: "", email: "", daily_rate: 0, skills: [], notes: "" });
    } catch (err: any) {
      toast.error(err.message || "Ekip üyesi eklenemedi");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground tracking-display">Ekip Üyesi Ekle</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ad Soyad *</Label>
            <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} required className="bg-input border-border" placeholder="Ahmet Yılmaz" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Rol *</Label>
            <Select value={form.role} onValueChange={(v) => update("role", v)}>
              <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Telefon</Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="bg-input border-border" placeholder="+90 555 ..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">E-posta</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="bg-input border-border" placeholder="ad@email.com" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Günlük Ücret (₺) *</Label>
            <Input type="number" min={0} value={form.daily_rate} onChange={(e) => update("daily_rate", Number(e.target.value))} className="bg-input border-border tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Yetenekler</Label>
            <div className="flex gap-2">
              <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                className="bg-input border-border" placeholder="MA Lighting, Dante..." />
              <Button type="button" variant="outline" size="sm" onClick={addSkill}>Ekle</Button>
            </div>
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.skills.map((skill) => (
                  <span key={skill} className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notlar</Label>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} className="bg-input border-border resize-none" rows={3} />
          </div>
          <Button type="submit" className="w-full" disabled={createMember.isPending}>
            {createMember.isPending ? "Ekleniyor..." : "Ekip Üyesi Ekle"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}