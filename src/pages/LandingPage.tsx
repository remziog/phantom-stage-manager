import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicNav, PublicFooter } from "@/components/landing/PublicLayout";
import { ArrowRight, Boxes, Warehouse, Truck, Check, Sparkles } from "lucide-react";

const verticals = [
  {
    icon: Boxes,
    title: "Rental",
    description: "Track assets, manage reservations, send invoices. Built for equipment, gear, vehicle, and event rental shops.",
    bullets: ["Asset utilization tracking", "Calendar reservations", "Auto invoicing"],
  },
  {
    icon: Warehouse,
    title: "Warehouse",
    description: "Real-time inventory, stock movements, and order fulfillment for small distribution operations.",
    bullets: ["SKU & barcode support", "Multi-location stock", "Order picking flow"],
  },
  {
    icon: Truck,
    title: "Logistics",
    description: "Plan deliveries, dispatch drivers, optimize routes. For couriers, last-mile, and freight SMBs.",
    bullets: ["Driver assignment", "Route planning", "Proof of delivery"],
  },
];

const tiers = [
  { name: "Free",    price: 0,  popular: false, features: ["1 user", "Up to 50 assets", "Email support"] },
  { name: "Starter", price: 9,  popular: false, features: ["3 users", "Up to 500 assets", "PDF invoices", "Basic reports"] },
  { name: "Growth",  price: 19, popular: true,  features: ["10 users", "Unlimited assets", "Custom branding", "Priority support", "API access"] },
  { name: "Pro",     price: 39, popular: false, features: ["Unlimited users", "Multi-location", "Advanced analytics", "AI agents (beta)", "SSO"] },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNav />

      {/* Hero */}
      <section className="relative gradient-hero">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/50 text-xs text-muted-foreground mb-6">
            <Sparkles className="h-3 w-3 text-accent" />
            Built for SMBs who've outgrown spreadsheets
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-display mb-6">
            Your operations,<br />
            <span className="gradient-text">one cloud.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Apex Cloud adapts to your business — rental, warehouse, or logistics — with a 60-second setup and modules that work out of the box.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/signup">Start free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#verticals">See how it works</a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card. Cancel anytime.</p>
        </div>
      </section>

      {/* Verticals */}
      <section id="verticals" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-display mb-3">One platform. Three verticals.</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Pick the module that fits your business. Mix them later as you grow.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {verticals.map((v) => (
            <Card key={v.title} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <v.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{v.description}</p>
                <ul className="space-y-2 text-sm">
                  {v.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-accent shrink-0" /> {b}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-display mb-3">Simple, fair pricing.</h2>
            <p className="text-muted-foreground">Per user, per month. Pay only for what you use.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {tiers.map((t) => (
              <Card
                key={t.name}
                className={t.popular ? "border-primary shadow-lg shadow-primary/10 relative" : ""}
              >
                {t.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    Most popular
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-1">{t.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">${t.price}</span>
                    <span className="text-sm text-muted-foreground">/user/mo</span>
                  </div>
                  <Button asChild className="w-full mb-5" variant={t.popular ? "default" : "outline"}>
                    <Link to="/signup">{t.price === 0 ? "Start free" : "Choose " + t.name}</Link>
                  </Button>
                  <ul className="space-y-2 text-sm">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" /> {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-display mb-4">Affordable. Adaptable. Yours.</h2>
        <p className="text-muted-foreground">
          Apex Cloud was built for the operators running small but ambitious businesses — the rental shops, warehouses,
          and logistics teams that deserve software as good as the enterprise tools, without the enterprise price tag.
        </p>
      </section>

      <PublicFooter />
    </div>
  );
}
