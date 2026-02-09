-- Add drink_style column to check_ins table for storing temperature/style preferences
ALTER TABLE check_ins ADD COLUMN drink_style text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN check_ins.drink_style IS 'Temperature/style preference: Hot, Cold, or NULL for no preference';
