import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, UserPlus, Shield, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

type UserWithRole = {
  id: string;
  user_id: string;
  role: AppRole;
  profile: { full_name: string | null; avatar_url: string | null } | null;
};

const roleBadgeColors: Record<AppRole, string> = {
  admin: "bg-primary/20 text-primary border-primary/30",
  team_member: "bg-accent/20 text-accent border-accent/30",
  customer: "bg-muted text-muted-foreground border-border",
};

export function UserManagement() {
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("team_member");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Get all user roles
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role");
      if (error) throw error;

      // Get profiles for those users
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      return roles.map((r) => ({
        ...r,
        profile: profiles?.find((p) => p.user_id === r.user_id) || null,
      })) as UserWithRole[];
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ roleId, newRole }: { roleId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const inviteUser = useMutation({
    mutationFn: async () => {
      // Use edge function to invite
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: inviteEmail, full_name: inviteName, role: inviteRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("team_member");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> User Management
            </CardTitle>
            <CardDescription>Manage users and their roles.</CardDescription>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" /> Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="team_member">Team Member</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => inviteUser.mutate()}
                  disabled={!inviteEmail || !inviteName || inviteUser.isPending}
                  className="w-full"
                >
                  {inviteUser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send Invitation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {u.profile?.full_name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{u.user_id.slice(0, 8)}...</p>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={u.role}
                    onValueChange={(v) => changeRole.mutate({ roleId: u.id, newRole: v as AppRole })}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="team_member">Team Member</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className={`text-xs ${roleBadgeColors[u.role]}`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {u.role.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
