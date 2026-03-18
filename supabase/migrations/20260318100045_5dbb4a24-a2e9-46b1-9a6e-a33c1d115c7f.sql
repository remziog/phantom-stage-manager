
-- Create expense_category enum
CREATE TYPE public.expense_category AS ENUM (
  'Transport',
  'Accommodation',
  'Meals',
  'Equipment Rental',
  'Venue',
  'Personnel',
  'Marketing',
  'Other'
);

-- Create expense_status enum
CREATE TYPE public.expense_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  category expense_category NOT NULL DEFAULT 'Other',
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  receipt_url TEXT,
  receipt_name TEXT,
  status expense_status NOT NULL DEFAULT 'pending',
  submitted_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  notes TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Team members can insert their own
CREATE POLICY "Users can insert own expenses" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

-- Team members can view own expenses
CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (auth.uid() = submitted_by);

-- Team members & crew can view all expenses
CREATE POLICY "Team can view all expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'team_member'));

-- Sales can view all expenses
CREATE POLICY "Sales can view all expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'sales'));

-- Crew can insert own expenses
CREATE POLICY "Crew can insert own expenses" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'crew') AND auth.uid() = submitted_by);

-- Updated_at trigger
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('expense-receipts', 'expense-receipts', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'expense-receipts');

CREATE POLICY "Authenticated users can view receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'expense-receipts');
