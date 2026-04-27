# Apex Cloud

> Your operations, one cloud. The operations platform for SMBs who've outgrown spreadsheets but can't afford enterprise software.

## What it does

Apex Cloud is a multi-tenant operations platform that adapts to how a small business actually runs. An onboarding wizard learns whether you do **rentals**, **warehousing**, or **logistics** and tailors the navigation, dashboard KPIs, and modules accordingly — so every team sees only the surface area they need.

## Who it's for

- Equipment **rental** businesses (AV, events, construction, party hire)
- **Warehouse** operators managing inventory across one or more locations
- **Logistics** SMBs coordinating dispatch, drivers, and proof of delivery
- Teams of **5–50 employees** who've outgrown spreadsheets but find Salesforce / SAP overkill

## Modules

- **Rental Operations** — assets, reservations, customers, invoices, PDF export · _live_
- **Warehouse Management** — inventory, picks, transfers · _planned_
- **Logistics & Dispatch** — routes, drivers, POD · _planned_
- **AI Operations Agent** — natural-language queries and workflow automation across all modules · _planned_

## Tech stack

- **Frontend:** React 18 + Vite 5 + TypeScript 5, shadcn/ui, Tailwind CSS v3
- **Data:** TanStack Query for server state, Zod for validation
- **Backend:** Supabase (Postgres, Auth, Row-Level Security, Storage, Edge Functions)
- **Testing:** Vitest (unit) + Playwright (E2E) + custom schema preflight

## Getting started

```sh
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
#   Fill in VITE_SUPABASE_URL, VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_PUBLISHABLE_KEY
#   from your Supabase project (Settings → API).

# 3. Run the dev server
npm run dev
```

The app expects the database schema in `supabase/migrations/` to be applied. If you're working in the Lovable Cloud sandbox, the schema is provisioned automatically.

## Architecture

Every tenant-owned table carries a `company_id` column, and **Row-Level Security policies** scoped to `is_company_member(company_id, auth.uid())` enforce isolation at the database layer — there is no application-level tenancy filter to forget. Users belong to one or more companies via the `company_members` table; their **active** company is tracked on `profiles.current_company_id`. Roles (`owner`, `admin`, `manager`, `operator`, `viewer`) gate write paths via `has_company_role(...)` helpers, and audit-only tables (`module_change_log`, `csv_edit_events`, `customer_update_requests`) intentionally allow only inserts/selects to keep history immutable.

## Testing

```sh
npm run test                  # Vitest unit tests (jsdom)
npm run test:coverage         # Vitest with v8 coverage
npm run test:e2e              # Playwright E2E (smoke, login, quote creation, RLS isolation)
npm run test:e2e:preflight    # Verify live Supabase schema matches what tests expect
npm run lint                  # ESLint
```

The **preflight** script (`scripts/e2e-preflight.ts`) probes the deployed Supabase project before E2E runs and diffs its schema against a baseline snapshot — see `scripts/e2e-preflight.ts` for the full CLI/env reference.

The **RLS multi-tenancy test** (`e2e/rls-multitenancy.e2e.ts`) provisions two isolated tenants, signs in as each, and asserts that no row from tenant A is visible — or mutable — from tenant B's session. This is the load-bearing security regression test; it must stay green.

## Status

**Pre-launch.** Looking for design partners in the rental, warehouse, and logistics verticals. If that's you, get in touch: `hello@apexcloud.app` _(replace with your real address)_.

## License

Proprietary — all rights reserved.
