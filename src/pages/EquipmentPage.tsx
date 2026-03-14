import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useEquipment } from "@/hooks/useEquipment";
import { EquipmentTable } from "@/components/equipment/EquipmentTable";
import { EquipmentGrid } from "@/components/equipment/EquipmentGrid";
import { AddEquipmentDrawer } from "@/components/equipment/AddEquipmentDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, LayoutGrid, List } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type ViewMode = "table" | "grid";

const categories = Constants.public.Enums.equipment_category;
const conditions = Constants.public.Enums.equipment_condition;
const locations = Constants.public.Enums.equipment_location;

export default function EquipmentPage() {
  const { data: equipment, isLoading } = useEquipment();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!equipment) return [];
    return equipment.filter((item) => {
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.brand?.toLowerCase().includes(search.toLowerCase()) ||
        item.model?.toLowerCase().includes(search.toLowerCase()) ||
        item.serial_number?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesCondition = conditionFilter === "all" || item.condition === conditionFilter;
      const matchesLocation = locationFilter === "all" || item.current_location === locationFilter;
      return matchesSearch && matchesCategory && matchesCondition && matchesLocation;
    });
  }, [equipment, search, categoryFilter, conditionFilter, locationFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-display text-foreground">Equipment</h1>
            <p className="text-sm text-muted-foreground">
              {equipment?.length ?? 0} items across your inventory.
            </p>
          </div>
          <Button onClick={() => setDrawerOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Equipment
          </Button>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search equipment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-input border-border"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] bg-input border-border">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={conditionFilter} onValueChange={setConditionFilter}>
            <SelectTrigger className="w-[140px] bg-input border-border">
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              {conditions.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[150px] bg-input border-border">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* View toggle */}
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "bg-input text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-input text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="rounded-lg bg-card p-12 phantom-shadow flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading equipment...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg bg-card p-12 phantom-shadow flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground">
              {equipment?.length === 0
                ? "No equipment in inventory."
                : "No equipment matches your filters."}
            </p>
            {equipment?.length === 0 ? (
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add New Item
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("all");
                  setConditionFilter("all");
                  setLocationFilter("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : viewMode === "table" ? (
          <EquipmentTable data={filtered} />
        ) : (
          <EquipmentGrid data={filtered} />
        )}
      </div>

      <AddEquipmentDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </DashboardLayout>
  );
}
