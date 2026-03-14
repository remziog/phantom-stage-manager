import { DashboardLayout } from "@/components/DashboardLayout";

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold tracking-display text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-lg bg-card p-12 phantom-shadow flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Module coming soon. [Add New Item] or [Clear Filters]</p>
        </div>
      </div>
    </DashboardLayout>
  );
}


export function TeamPage() {
  return <PlaceholderPage title="Team" description="Manage your crew and technicians." />;
}

export function LogisticsPage() {
  return <PlaceholderPage title="Logistics" description="Fleet and vehicle management." />;
}

export function CustomersPage() {
  return <PlaceholderPage title="Customers" description="Manage your client relationships." />;
}

export function QuotesPage() {
  return <PlaceholderPage title="Quotes" description="Create and manage proposals." />;
}

export function EventsPage() {
  return <PlaceholderPage title="Events" description="Track active and upcoming events." />;
}

export function SettingsPage() {
  return <PlaceholderPage title="Settings" description="Company profile and configuration." />;
}
