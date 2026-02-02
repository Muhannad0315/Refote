-- Add update policy for profiles so authenticated users may update their own row
-- This complements the existing INSERT/select policies and is required when RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'profiles_update_own'
  ) THEN
    EXECUTE $$
      CREATE POLICY profiles_update_own
        ON public.profiles
        FOR UPDATE
        USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
        WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
    $$;
  END IF;
END$$;
