-- Phase 1 Supabase schema for coffee_places and check_ins
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table: coffee_places
CREATE TABLE IF NOT EXISTS public.coffee_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id text UNIQUE NOT NULL,
  name text NOT NULL,
  lat double precision,
  lng double precision,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.coffee_places ENABLE ROW LEVEL SECURITY;

-- Public read policy (allow anyone to SELECT)
CREATE POLICY coffee_places_public_select
  ON public.coffee_places
  FOR SELECT
  USING (true);

-- Allow authenticated users to INSERT (optional)
CREATE POLICY coffee_places_authenticated_insert
  ON public.coffee_places
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Table: check_ins
CREATE TABLE IF NOT EXISTS public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES public.coffee_places(id) ON DELETE CASCADE,
  drink_name text NOT NULL,
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security on check_ins
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- RLS: users can SELECT only their own check-ins
CREATE POLICY check_ins_select_own
  ON public.check_ins
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS: users can INSERT only for themselves
CREATE POLICY check_ins_insert_own
  ON public.check_ins
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS: users can UPDATE only their own check-ins and cannot change owner
CREATE POLICY check_ins_update_own
  ON public.check_ins
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS: users can DELETE only their own check-ins
CREATE POLICY check_ins_delete_own
  ON public.check_ins
  FOR DELETE
  USING (user_id = auth.uid());

-- End of schema_phase1.sql
