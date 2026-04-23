/**
 * Module gating: maps the modules saved during onboarding (in `company.settings.enabled_modules`)
 * to sidebar items and route paths. Keep this in one place so adding a new module is a one-line change.
 */
import type { Database } from "@/integrations/supabase/types";

type Industry = Database["public"]["Enums"]["industry_type"];

/** Maps a module label (as stored in onboarding) → the route path it controls. */
export const MODULE_TO_PATH: Record<string, string> = {
  // rental + mixed
  Assets: "/app/assets",
  Reservations: "/app/reservations",
  Customers: "/app/customers",
  Invoices: "/app/invoices",
  Reports: "/app/reports",
  // warehouse
  Inventory: "/app/assets",
  Movements: "/app/reservations",
  Orders: "/app/invoices",
  // logistics
  Deliveries: "/app/reservations",
  Routes: "/app/assets",
};

/** Industry defaults — used as a fallback when no `enabled_modules` is saved yet. */
export const INDUSTRY_DEFAULT_MODULES: Record<Industry, string[]> = {
  rental: ["Assets", "Reservations", "Customers", "Invoices", "Reports"],
  warehouse: ["Inventory", "Movements", "Customers", "Orders", "Reports"],
  logistics: ["Deliveries", "Routes", "Customers", "Invoices", "Reports"],
  mixed: ["Assets", "Reservations", "Customers", "Invoices", "Reports"],
};

/**
 * Read modules from a company's settings JSON.
 * Falls back to the industry default list, and finally to the rental defaults.
 */
export function getEnabledModules(
  settings: unknown,
  industry: Industry | null | undefined,
): string[] {
  const fromSettings =
    settings && typeof settings === "object" && "enabled_modules" in settings
      ? (settings as { enabled_modules?: unknown }).enabled_modules
      : undefined;
  if (Array.isArray(fromSettings) && fromSettings.length > 0) {
    return fromSettings.filter((x): x is string => typeof x === "string");
  }
  return INDUSTRY_DEFAULT_MODULES[industry ?? "rental"] ?? INDUSTRY_DEFAULT_MODULES.rental;
}

/** Convert the enabled modules list into the set of allowed route paths. */
export function getEnabledPaths(modules: string[]): Set<string> {
  const paths = new Set<string>(["/app", "/app/settings"]); // always available
  for (const m of modules) {
    const path = MODULE_TO_PATH[m];
    if (path) paths.add(path);
  }
  return paths;
}
