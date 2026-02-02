-- Add photo_reference column to coffee_places if it does not exist
ALTER TABLE IF EXISTS public.coffee_places
ADD COLUMN IF NOT EXISTS photo_reference TEXT;
