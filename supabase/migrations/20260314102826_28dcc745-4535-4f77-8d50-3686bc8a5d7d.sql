
-- Create vehicle enums
CREATE TYPE public.vehicle_type AS ENUM ('Truck', 'Van', 'Trailer', 'Crane', 'Other');
CREATE TYPE public.vehicle_status AS ENUM ('In Garage', 'On Route', 'On Event Site', 'Under Maintenance');

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type vehicle_type NOT NULL,
  license_plate TEXT NOT NULL,
  capacity_kg NUMERIC,
  capacity_volume_m3 NUMERIC,
  daily_cost NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  current_status vehicle_status NOT NULL DEFAULT 'In Garage',
  driver_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vehicles"
  ON public.vehicles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage vehicles"
  ON public.vehicles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
