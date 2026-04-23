import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ApexLogo } from "@/components/ApexLogo";
import { useToast } from "@/hooks/use-toast";
import { createCompany } from "@/services/companies";

export default function CreateCompanyPage() {
  const navigate = useNavigate();
  const { user, refreshCompany } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await createCompany({ name, userId: user.id });
      await refreshCompany();
      toast({ title: "Workspace created", description: "Now let's customize it for you." });
      navigate("/onboarding");
    } catch (err) {
      toast({ title: "Could not create workspace", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 gradient-hero">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <ApexLogo />
          <CardTitle>Create your workspace</CardTitle>
          <CardDescription>This will be the name your team and customers see.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company name</Label>
              <Input id="name" required placeholder="Acme Operations" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
              {loading ? "Creating…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
