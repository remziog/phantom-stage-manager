import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Package,
  Calendar,
  FileText,
  TrendingUp,
} from "lucide-react";

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg bg-card p-5 phantom-shadow animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-semibold tabular-nums tracking-display text-foreground">
            {value}
          </p>
        </div>
        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-display text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Precision engineering for every stage.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Equipment Value" value="₺0" icon={Package} />
        <MetricCard title="Active Events" value="0" icon={Calendar} />
        <MetricCard title="Open Quotes" value="0" icon={FileText} />
        <MetricCard title="Revenue This Month" value="₺0" icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg bg-card p-5 phantom-shadow">
          <h3 className="text-sm font-medium text-foreground mb-4">Upcoming Events</h3>
          <p className="text-sm text-muted-foreground">No upcoming events. Create one from an accepted quote.</p>
        </div>
        <div className="rounded-lg bg-card p-5 phantom-shadow">
          <h3 className="text-sm font-medium text-foreground mb-4">Recent Quotes</h3>
          <p className="text-sm text-muted-foreground">No quotes yet. Create your first quote.</p>
        </div>
      </div>
    </div>
  );
}

function CustomerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-display text-foreground">Welcome</h1>
        <p className="text-sm text-muted-foreground">View your quotes and events.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg bg-card p-5 phantom-shadow">
          <h3 className="text-sm font-medium text-foreground mb-4">My Quotes</h3>
          <p className="text-sm text-muted-foreground">No quotes yet.</p>
        </div>
        <div className="rounded-lg bg-card p-5 phantom-shadow">
          <h3 className="text-sm font-medium text-foreground mb-4">My Events</h3>
          <p className="text-sm text-muted-foreground">No events yet.</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      {role === "customer" ? <CustomerDashboard /> : <AdminDashboard />}
    </DashboardLayout>
  );
}
