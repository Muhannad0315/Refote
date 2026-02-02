-- Add `is_complete` column to profiles to track onboarding completion
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS is_complete boolean NOT NULL DEFAULT false;

-- Backfill existing NULLs (defensive) — set to false where unknown
UPDATE public.profiles SET is_complete = false WHERE is_complete IS NULL;
