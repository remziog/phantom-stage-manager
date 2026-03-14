
-- Create enums for equipment
CREATE TYPE public.equipment_category AS ENUM ('Light', 'Sound', 'Video/Image', 'Truss', 'Rigging', 'Power/Cable', 'Other');
CREATE TYPE public.equipment_condition AS ENUM ('Excellent', 'Good', 'Fair', 'Needs Repair');
CREATE TYPE public.equipment_location AS ENUM ('Warehouse', 'On Event', 'In Transit', 'Under Maintenance');

-- Create equipment table
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category equipment_category NOT NULL,
  subcategory TEXT,
  brand TEXT,
  model TEXT,
  serial_number TEXT UNIQUE,
  quantity_total INTEGER NOT NULL DEFAULT 1,
  quantity_available INTEGER NOT NULL DEFAULT 1,
  gross_price_per_day NUMERIC NOT NULL DEFAULT 0,
  weight_kg NUMERIC,
  power_consumption_watts INTEGER,
  condition equipment_condition NOT NULL DEFAULT 'Good',
  current_location equipment_location NOT NULL DEFAULT 'Warehouse',
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- RLS: Admins and team members can read all equipment
CREATE POLICY "Authenticated users can view equipment"
  ON public.equipment FOR SELECT
  TO authenticated
  USING (true);

-- RLS: Admins can do everything
CREATE POLICY "Admins can manage equipment"
  ON public.equipment FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Team members can insert and update
CREATE POLICY "Team members can insert equipment"
  ON public.equipment FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'team_member'));

CREATE POLICY "Team members can update equipment"
  ON public.equipment FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'team_member'));

-- Trigger for updated_at
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add constraint
ALTER TABLE public.equipment ADD CONSTRAINT quantity_available_check 
  CHECK (quantity_available >= 0 AND quantity_available <= quantity_total);
