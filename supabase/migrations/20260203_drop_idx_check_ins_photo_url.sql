-- Drop index on photo_url if it exists. This will be applied temporarily until storage URLs are guaranteed.
DROP INDEX IF EXISTS public.idx_check_ins_photo_url;
