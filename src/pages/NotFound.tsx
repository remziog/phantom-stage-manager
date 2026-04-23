import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ApexLogo } from "@/components/ApexLogo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gradient-hero p-6">
      <ApexLogo size="lg" />
      <h1 className="text-6xl font-bold tracking-display mt-8">404</h1>
      <p className="text-muted-foreground mt-2">This page doesn't exist.</p>
      <Button asChild className="mt-6">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}
