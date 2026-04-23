
-- ============================================================
-- DROP EVERYTHING FROM PHANTOM CRM
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TABLE IF EXISTS public.loading_list_items CASCADE;
DROP TABLE IF EXISTS public.loading_lists CASCADE;
DROP TABLE IF EXISTS public.equipment_faults CASCADE;
DROP TABLE IF EXISTS public.event_equipment CASCADE;
DROP TABLE IF EXISTS public.event_team CASCADE;
DROP TABLE IF EXISTS public.event_vehicles CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.quote_line_items CASCADE;
DROP TABLE IF EXISTS public.quote_requests CASCADE;
DROP TABLE IF EXISTS public.quotes CASCADE;
DROP TABLE IF EXISTS public.customer_price_list CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.equipment CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.company_settings CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_customer_id_for_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.notify_admins_on_quote_request() CASCADE;
DROP FUNCTION IF EXISTS public.notify_admins_on_quote_response() CASCADE;
DROP FUNCTION IF EXISTS public.notify_customer_on_quote() CASCADE;
DROP FUNCTION IF EXISTS public.notify_customer_on_event_status() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_expense_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.generate_quote_number() CASCADE;
DROP FUNCTION IF EXISTS public.auto_generate_qr_code() CASCADE;

DROP SEQUENCE IF EXISTS public.quote_number_seq CASCADE;

DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.customer_type CASCADE;
DROP TYPE IF EXISTS public.equipment_category CASCADE;
DROP TYPE IF EXISTS public.equipment_condition CASCADE;
DROP TYPE IF EXISTS public.equipment_location CASCADE;
DROP TYPE IF EXISTS public.event_status CASCADE;
DROP TYPE IF EXISTS public.expense_category CASCADE;
DROP TYPE IF EXISTS public.expense_status CASCADE;
DROP TYPE IF EXISTS public.line_item_type CASCADE;
DROP TYPE IF EXISTS public.quote_status CASCADE;
DROP TYPE IF EXISTS public.team_role CASCADE;
DROP TYPE IF EXISTS public.vehicle_status CASCADE;
DROP TYPE IF EXISTS public.vehicle_type CASCADE;

-- ============================================================
-- APEX CLOUD: ENUMS
-- ============================================================
CREATE TYPE public.industry_type AS ENUM ('rental', 'warehouse', 'logistics', 'mixed');
CREATE TYPE public.subscription_tier AS ENUM ('free', 'starter', 'growth', 'pro');
CREATE TYPE public.member_role AS ENUM ('owner', 'admin', 'manager', 'operator', 'viewer');
CREATE TYPE public.asset_status AS ENUM ('available', 'rented', 'in_maintenance', 'sold', 'archived');
CREATE TYPE public.transaction_type AS ENUM ('rental', 'sale', 'shipment', 'return');
CREATE TYPE public.transaction_status AS ENUM ('draft', 'confirmed', 'active', 'returned', 'cancelled');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- ============================================================
-- TIMESTAMPS HELPER
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  current_company_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  industry_type public.industry_type,
  subscription_tier public.subscription_tier NOT NULL DEFAULT 'free',
  onboarding_completed boolean NOT NULL DEFAULT false,
  logo_url text,
  primary_color text DEFAULT '#4F46E5',
  currency text NOT NULL DEFAULT 'USD',
  tax_id text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- COMPANY MEMBERS
-- ============================================================
CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.member_role NOT NULL DEFAULT 'operator',
  invited_by uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_company_members_user ON public.company_members(user_id);
CREATE INDEX idx_company_members_company ON public.company_members(company_id);

-- ============================================================
-- SECURITY DEFINER HELPERS (avoid RLS recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_company_member(_company_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = _company_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.has_company_role(_company_id uuid, _user_id uuid, _roles public.member_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = _company_id AND user_id = _user_id AND role = ANY(_roles));
$$;

CREATE OR REPLACE FUNCTION public.get_current_company_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT current_company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  tax_id text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_customers_company ON public.customers(company_id);
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ASSETS
-- ============================================================
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  category text,
  status public.asset_status NOT NULL DEFAULT 'available',
  location text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_assets_company ON public.assets(company_id);
CREATE INDEX idx_assets_status ON public.assets(company_id, status);
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL DEFAULT 'rental',
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  status public.transaction_status NOT NULL DEFAULT 'draft',
  start_date date,
  end_date date,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_transactions_company ON public.transactions(company_id);
CREATE INDEX idx_transactions_customer ON public.transactions(customer_id);
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TRANSACTION ITEMS
-- ============================================================
CREATE TABLE public.transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  description text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_transaction_items_tx ON public.transaction_items(transaction_id);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE SEQUENCE public.invoice_number_seq START 1000;
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  total numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, invoice_number)
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_invoices_company ON public.invoices(company_id);
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || LPAD(nextval('public.invoice_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_invoices_number BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_number();

-- ============================================================
-- AGENTS (stub for future AI per company)
-- ============================================================
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  system_prompt text,
  tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_agents_company ON public.agents(company_id);
CREATE TRIGGER trg_agents_updated BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================
-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- companies
CREATE POLICY "companies_select_member" ON public.companies FOR SELECT TO authenticated USING (public.is_company_member(id, auth.uid()));
CREATE POLICY "companies_insert_self" ON public.companies FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "companies_update_admin" ON public.companies FOR UPDATE TO authenticated USING (public.has_company_role(id, auth.uid(), ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY "companies_delete_owner" ON public.companies FOR DELETE TO authenticated USING (public.has_company_role(id, auth.uid(), ARRAY['owner']::public.member_role[]));

-- company_members
CREATE POLICY "members_select_own_company" ON public.company_members FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "members_insert_self_or_admin" ON public.company_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_company_role(company_id, auth.uid(), ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY "members_update_admin" ON public.company_members FOR UPDATE TO authenticated USING (public.has_company_role(company_id, auth.uid(), ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY "members_delete_admin" ON public.company_members FOR DELETE TO authenticated USING (public.has_company_role(company_id, auth.uid(), ARRAY['owner','admin']::public.member_role[]));

-- generic helper macro: tenant tables (customers, assets, transactions, transaction_items, invoices, agents)
CREATE POLICY "customers_tenant_all" ON public.customers FOR ALL TO authenticated USING (public.is_company_member(company_id, auth.uid())) WITH CHECK (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "assets_tenant_all" ON public.assets FOR ALL TO authenticated USING (public.is_company_member(company_id, auth.uid())) WITH CHECK (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "transactions_tenant_all" ON public.transactions FOR ALL TO authenticated USING (public.is_company_member(company_id, auth.uid())) WITH CHECK (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "transaction_items_tenant_all" ON public.transaction_items FOR ALL TO authenticated USING (public.is_company_member(company_id, auth.uid())) WITH CHECK (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "invoices_tenant_all" ON public.invoices FOR ALL TO authenticated USING (public.is_company_member(company_id, auth.uid())) WITH CHECK (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "agents_tenant_all" ON public.agents FOR ALL TO authenticated USING (public.is_company_member(company_id, auth.uid())) WITH CHECK (public.is_company_member(company_id, auth.uid()));

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
