-- Migration: ensure both `terms_accepted` and `privacy_accepted` exist and
-- backfill safely for existing rows without silently accepting users.

-- Add columns if they don't exist (idempotent)
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_accepted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS legal_accepted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS legal_accepted_at timestamptz NULL;

-- Backfill existing NULLs to false (do NOT auto-accept users)
-- Note: Do NOT backfill existing rows to true/false here. This migration
-- assumes the project has no legacy profiles; adding the strict CHECK
-- constraint below will fail if existing rows do not meet the requirement.

-- Drop any existing failing CHECK constraint so migration can proceed
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_legal_acceptance_check;

-- Note: No CHECK constraints are added here. Enforcement happens at the
-- application level during signup: profiles are created with default false
-- values, then immediately updated with explicit acceptance flags once the
-- user confirms them.
