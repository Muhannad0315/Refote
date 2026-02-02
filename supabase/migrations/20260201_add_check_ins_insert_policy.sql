-- Enable row level security on check_ins and only allow inserts when
-- the authenticated user's profile has is_complete = true.

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Policy: allow authenticated users to insert check_ins only when their
-- profile row exists and has is_complete = true.
CREATE POLICY "allow_insert_if_profile_complete" ON public.check_ins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.is_complete = true
    )
  );

-- Note: service role requests using the Supabase service key bypass RLS.