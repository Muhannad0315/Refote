-- Add country column to coffee_places table
-- This enables country-aware Discover without breaking existing architecture

ALTER TABLE public.coffee_places
ADD COLUMN IF NOT EXISTS country text;

-- Add index for efficient country filtering
CREATE INDEX IF NOT EXISTS idx_coffee_places_country ON public.coffee_places(country);

-- Add comment for documentation
COMMENT ON COLUMN public.coffee_places.country IS 'ISO-2 country code (e.g., SA, UK, US) detected from Google Places data';
