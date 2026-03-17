import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Hesap oluşturuldu! Onay için e-postanızı kontrol edin.");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-8 p-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tighter text-foreground">
            PHANTOM
          </h1>
          <p className="text-sm text-muted-foreground">
            Etkinlik Mühendisliği CRM
          </p>
        </div>

        {/* Card */}
        <div className="rounded-lg bg-card p-6 phantom-shadow space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-display text-foreground">
              {isSignUp ? "Hesap Oluştur" : "Giriş Yap"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignUp
                ? "Başlamak için kayıt olun"
                : "Devam etmek için bilgilerinizi girin"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm text-muted-foreground">Ad Soyad</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Adınız ve soyadınız"
                  required
                  className="bg-input border-border focus:ring-primary focus:phantom-glow"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="siz@sirket.com"
                required
                className="bg-input border-border focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground">Şifre</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-input border-border focus:ring-primary"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Yükleniyor..." : isSignUp ? "Hesap Oluştur" : "Giriş Yap"}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:text-accent transition-colors"
            >
              {isSignUp
                ? "Zaten hesabınız var mı? Giriş yapın"
                : "Hesabınız yok mu? Kayıt olun"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Phantom Etkinlik Mühendisliği © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}