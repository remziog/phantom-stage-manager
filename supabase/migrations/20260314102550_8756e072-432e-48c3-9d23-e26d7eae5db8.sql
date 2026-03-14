
-- Create team role enum
CREATE TYPE public.team_role AS ENUM (
  'Project Manager', 'Light Technician', 'Sound Technician', 'Video Technician',
  'Rigger', 'Stage Hand', 'Driver', 'General Crew'
);

-- Create team_members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role team_role NOT NULL,
  phone TEXT,
  email TEXT,
  daily_rate NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  skills TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view team members
CREATE POLICY "Authenticated users can view team members"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage team members
CREATE POLICY "Admins can manage team members"
  ON public.team_members FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Team members can update their own availability
CREATE POLICY "Team members can update own record"
  ON public.team_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
