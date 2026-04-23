import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Supabase mock simulates the production setup:
 *   1. A `module_change_log` table that we can read back via `.select()`
 *   2. An `upsert(..., { onConflict, ignoreDuplicates })` that enforces a
 *      partial unique index on
 *        (company_id, user_id, module, action, source, minute_bucket(created_at))
 *      — i.e. the same logical change in the same minute is dropped.
 *
 * This lets us assert end-to-end that 5 rapid wizard saves only ever produce
 * one row per (company, user, module, action, source) minute bucket.
 */
type Row = {
  company_id: string;
  user_id: string | null;
  user_email: string | null;
  module: string;
  action: "enabled" | "disabled";
  source: "onboarding" | "settings";
  created_at: string;
};

let store: Row[] = [];
let now = new Date("2025-01-01T10:00:00.000Z");

const minuteBucket = (iso: string) => iso.slice(0, 16); // YYYY-MM-DDTHH:MM

function makeQuery(rows: Row[]) {
  // Chainable query builder used by `.select().eq().in().order()`
  const q = {
    _rows: rows,
    eq(col: keyof Row, val: unknown) {
      this._rows = this._rows.filter((r) => r[col] === val);
      return this;
    },
    in(col: keyof Row, vals: unknown[]) {
      this._rows = this._rows.filter((r) => vals.includes(r[col] as never));
      return this;
    },
    order() { return this; },
    limit() { return this; },
    then(resolve: (v: { data: Row[]; error: null }) => void) {
      resolve({ data: this._rows, error: null });
    },
  };
  return q;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from(table: string) {
      if (table !== "module_change_log") throw new Error(`unexpected table ${table}`);
      return {
        select() { return makeQuery([...store]); },
        async upsert(
          rows: Omit<Row, "created_at">[],
          opts: { onConflict: string; ignoreDuplicates: boolean },
        ) {
          // Sanity-check the call shape — these are the production guarantees.
          expect(opts.onConflict).toBe(
            "company_id,user_id,module,action,source,minute_bucket",
          );
          expect(opts.ignoreDuplicates).toBe(true);

          const created_at = now.toISOString();
          for (const r of rows) {
            const dupe = store.some(
              (existing) =>
                existing.company_id === r.company_id &&
                existing.user_id === r.user_id &&
                existing.module === r.module &&
                existing.action === r.action &&
                existing.source === r.source &&
                minuteBucket(existing.created_at) === minuteBucket(created_at),
            );
            if (!dupe) store.push({ ...r, created_at });
          }
          return { error: null };
        },
      };
    },
  },
}));

import { logModuleChanges } from "@/services/moduleLog";

const COMPANY = "company-1";
const USER = "user-1";
const EMAIL = "owner@example.com";

beforeEach(() => {
  store = [];
  now = new Date("2025-01-01T10:00:00.000Z");
});

describe("logModuleChanges — onboarding idempotency", () => {
  it("records each enabled module exactly once across 5 rapid identical saves", async () => {
    const after = ["Assets", "Reservations", "Customers", "Invoices", "Reports"];

    // Simulate the user double-/triple-clicking "Finish" — 5 rapid saves with the
    // same before/after lists (all within the same minute bucket).
    for (let i = 0; i < 5; i++) {
      await logModuleChanges({
        companyId: COMPANY,
        userId: USER,
        userEmail: EMAIL,
        before: [],
        after,
        source: "onboarding",
      });
    }

    // Exactly 5 rows total — one per module — not 25.
    expect(store).toHaveLength(after.length);

    // And no (module, action, minute) tuple appears twice.
    const seen = new Set<string>();
    for (const row of store) {
      const key = [
        row.company_id, row.user_id, row.module, row.action, row.source,
        minuteBucket(row.created_at),
      ].join("|");
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }

    // All recorded transitions are "enabled" from this onboarding flow.
    expect(store.every((r) => r.action === "enabled" && r.source === "onboarding")).toBe(true);
  });

  it("client-side diff: identical before/after writes nothing", async () => {
    const list = ["Assets", "Customers"];
    await logModuleChanges({
      companyId: COMPANY,
      userId: USER,
      userEmail: EMAIL,
      before: list,
      after: list,
      source: "settings",
    });
    expect(store).toHaveLength(0);
  });

  it("allows a legitimate re-transition in a later minute bucket", async () => {
    // Enable a module now…
    await logModuleChanges({
      companyId: COMPANY, userId: USER, userEmail: EMAIL,
      before: [], after: ["Assets"], source: "settings",
    });
    expect(store).toHaveLength(1);

    // …repeat in the same minute — index dedupes.
    await logModuleChanges({
      companyId: COMPANY, userId: USER, userEmail: EMAIL,
      before: [], after: ["Assets"], source: "settings",
    });
    expect(store).toHaveLength(1);

    // Advance time to the next minute, disable, then re-enable — both should land.
    now = new Date("2025-01-01T10:01:00.000Z");
    await logModuleChanges({
      companyId: COMPANY, userId: USER, userEmail: EMAIL,
      before: ["Assets"], after: [], source: "settings",
    });
    now = new Date("2025-01-01T10:02:00.000Z");
    await logModuleChanges({
      companyId: COMPANY, userId: USER, userEmail: EMAIL,
      before: [], after: ["Assets"], source: "settings",
    });

    expect(store).toHaveLength(3);
    expect(store.map((r) => r.action)).toEqual(["enabled", "disabled", "enabled"]);
  });
});
