-- Add photo_url and tasting_notes to check_ins
ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS photo_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tasting_notes text DEFAULT NULL;

-- Optional: create index for faster lookup when querying recent photos
CREATE INDEX IF NOT EXISTS idx_check_ins_photo_url ON public.check_ins (photo_url) WHERE photo_url IS NOT NULL;

-- Note: run this migration against your Supabase project or paste to SQL editor.
