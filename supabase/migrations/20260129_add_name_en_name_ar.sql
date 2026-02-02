-- Migration: add name_en (NOT NULL) and name_ar (nullable) to coffee_places
-- Date: 2026-01-29

BEGIN;

-- 1) Add columns if not present
ALTER TABLE IF EXISTS public.coffee_places
  ADD COLUMN IF NOT EXISTS name_en text;

ALTER TABLE IF EXISTS public.coffee_places
  ADD COLUMN IF NOT EXISTS name_ar text;

-- 2) Migrate existing `name` values into `name_ar` when `name_ar` is empty
UPDATE public.coffee_places
SET name_ar = name
WHERE (name_ar IS NULL OR name_ar = '') AND (name IS NOT NULL);

-- 3) Backfill `name_en` with existing `name` where missing so we can safely add NOT NULL
UPDATE public.coffee_places
SET name_en = name
WHERE name_en IS NULL AND name IS NOT NULL;

-- 4) For any remaining rows without name_en (very unlikely given original schema), set empty string
UPDATE public.coffee_places
SET name_en = ''
WHERE name_en IS NULL;

-- 5) Enforce NOT NULL constraint on name_en
ALTER TABLE public.coffee_places
  ALTER COLUMN name_en SET NOT NULL;

COMMIT;

-- Notes:
-- - This migration preserves the existing `name` column and data.
-- - Existing values in `name` are copied into `name_ar` per requirement.
-- - `name_en` is backfilled from `name` and then set NOT NULL.
-- - No new tables are introduced and existing data is not removed.
