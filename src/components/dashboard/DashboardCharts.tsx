import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = [
  "hsl(142, 71%, 45%)",  // Warehouse - success green
  "hsl(221, 83%, 53%)",  // On Event - primary blue
  "hsl(38, 92%, 50%)",   // In Transit - warning orange
  "hsl(0, 84%, 60%)",    // Under Maintenance - destructive red
];

type Quote = { status: string; total: number; created_at: string };
type Equipment = { quantity_total: number; current_location: string };

export function RevenueBarChart({ quotes }: { quotes: Quote[] }) {
  const data = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
      months[key] = 0;
    }
    // Sum approved quotes
    quotes
      .filter((q) => q.status === "Approved")
      .forEach((q) => {
        const d = new Date(q.created_at);
        const key = d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
        if (key in months) months[key] += q.total;
      });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  }, [quotes]);

  return (
    <Card className="phantom-shadow border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground">Monthly Revenue (Last 12 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
              <XAxis
                dataKey="month"
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
                axisLine={{ stroke: "hsl(222, 30%, 18%)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222, 47%, 9%)",
                  border: "1px solid hsl(222, 30%, 18%)",
                  borderRadius: "8px",
                  color: "hsl(210, 40%, 98%)",
                  fontSize: 12,
                }}
                formatter={(value: number) => [
                  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value),
                  "Revenue",
                ]}
              />
              <Bar dataKey="revenue" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function EquipmentUtilizationPieChart({ equipment }: { equipment: Equipment[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {
      Warehouse: 0,
      "On Event": 0,
      "In Transit": 0,
      "Under Maintenance": 0,
    };
    equipment.forEach((e) => {
      counts[e.current_location] = (counts[e.current_location] || 0) + e.quantity_total;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0);
  }, [equipment]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="phantom-shadow border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground">Equipment Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          {total === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">No equipment data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: "hsl(215, 20%, 55%)", fontSize: 11 }}>{value}</span>
                  )}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 9%)",
                    border: "1px solid hsl(222, 30%, 18%)",
                    borderRadius: "8px",
                    color: "hsl(210, 40%, 98%)",
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${value} items (${Math.round((value / total) * 100)}%)`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
