-- ====================================================================
-- QUICK START: Top Drinks Setup (Run These Queries in Order)
-- ====================================================================

-- STEP 1: See your current drinks
-- Run this first to understand what you have
SELECT id, name, type FROM drinks ORDER BY name;

-- STEP 2: See how many check-ins reference each drink
SELECT 
  d.id,
  d.name,
  COUNT(ci.id) as num_check_ins,
  AVG(ci.rating) as avg_rating
FROM drinks d
LEFT JOIN check_ins ci ON ci.drink_id = d.id
GROUP BY d.id, d.name
ORDER BY num_check_ins DESC, d.name;

-- STEP 3: Check if drinks have realistic names
-- If results from STEP 2 show names like "drink-1", "drink-2", proceed to STEP 4
-- If names are good (Latte, Cappuccino, etc), skip to STEP 7

-- STEP 4: Update drink names to real names
-- Adjust these based on your actual drink IDs
UPDATE drinks SET name = 'Latte', type = 'Espresso-based', style = 'Milky' 
WHERE id = 'drink-1';

UPDATE drinks SET name = 'Cappuccino', type = 'Espresso-based', style = 'Balanced' 
WHERE id = 'drink-2';

UPDATE drinks SET name = 'Espresso', type = 'Espresso-based', style = 'Single Shot' 
WHERE id = 'drink-3';

UPDATE drinks SET name = 'Americano', type = 'Espresso-based', style = 'Long' 
WHERE id = 'drink-4';

UPDATE drinks SET name = 'Cold Brew', type = 'Filter', style = 'Chilled' 
WHERE id = 'drink-5';

-- Add more as needed - run STEP 2 again to see all drink IDs

-- STEP 5: Verify check_ins have cafe_id
SELECT 
  COUNT(*) as total_check_ins,
  COUNT(CASE WHEN cafe_id IS NOT NULL THEN 1 END) as with_cafe_id,
  COUNT(CASE WHEN cafe_id IS NULL THEN 1 END) as missing_cafe_id
FROM check_ins;

-- If missing_cafe_id > 0, you need to populate them:
-- (This query shows which cafes need cafe_id populated)
SELECT DISTINCT drink_id, COUNT(*) 
FROM check_ins 
WHERE cafe_id IS NULL 
GROUP BY drink_id;

-- STEP 6: Find a cafe with check-ins to test
SELECT 
  cf.id,
  cf.name_en,
  COUNT(ci.id) as check_in_count
FROM coffee_places cf
LEFT JOIN check_ins ci ON ci.cafe_id = cf.id
WHERE ci.id IS NOT NULL
GROUP BY cf.id, cf.name_en
ORDER BY check_in_count DESC
LIMIT 1;

-- Copy the cafe ID from results above

-- STEP 7: Test the get_top_drinks_for_cafe function
-- Replace 'PASTE_CAFE_ID_HERE' with actual ID from STEP 6
SELECT 
  drink_id,
  drink_name,
  avg_rating,
  check_in_count
FROM get_top_drinks_for_cafe('PASTE_CAFE_ID_HERE', 1, 3)
ORDER BY avg_rating DESC, check_in_count DESC;

-- Expected output should show real drink names like:
-- drink_id    | drink_name    | avg_rating | check_in_count
-- ------------|---------------|------------|----------------
-- uuid-123    | Latte         | 4.5        | 5
-- uuid-456    | Cappuccino    | 4.2        | 3
-- uuid-789    | Espresso      | 4.0        | 2

-- If this shows real drink names → Top Drinks will work in UI!
-- If this is empty → check if cafe has check_ins with cafe_id populated
-- If this shows "drink-1" → go back to STEP 4 and update names

-- ====================================================================
-- OPTIONAL: If You Want to Start Fresh with Real Drinks
-- ====================================================================

-- WARNING: This deletes all drinks and recreates them
-- Only run if you want to completely reset

-- 1. Delete all drinks (this cascades to check_ins if foreign key exists)
-- DELETE FROM drinks;

-- 2. Insert proper drinks with UUIDs
-- INSERT INTO drinks (id, name, type, style, description) VALUES
--   (gen_random_uuid(), 'Espresso', 'Espresso-based', 'Single Shot', 'Strong, concentrated coffee shot'),
--   (gen_random_uuid(), 'Latte', 'Espresso-based', 'Milky', 'Espresso with steamed milk and foam'),
--   (gen_random_uuid(), 'Cappuccino', 'Espresso-based', 'Balanced', 'Equal parts espresso, steamed milk, foam'),
--   (gen_random_uuid(), 'Americano', 'Espresso-based', 'Long', 'Espresso diluted with hot water'),
--   (gen_random_uuid(), 'Macchiato', 'Espresso-based', 'Marked', 'Espresso marked with milk'),
--   (gen_random_uuid(), 'Cortado', 'Espresso-based', 'Balanced', 'Equal parts espresso and warm milk'),
--   (gen_random_uuid(), 'Flat White', 'Espresso-based', 'Creamy', 'Espresso with velvety steamed milk'),
--   (gen_random_uuid(), 'Mocha', 'Espresso-based', 'Chocolatey', 'Espresso with milk and chocolate'),
--   (gen_random_uuid(), 'Cold Brew', 'Filter', 'Chilled', 'Coffee steeped in cold water'),
--   (gen_random_uuid(), 'Iced Latte', 'Cold', 'Iced', 'Latte served over ice'),
--   (gen_random_uuid(), 'Black Coffee', 'Filter', 'Hot', 'Regular drip coffee'),
--   (gen_random_uuid(), 'Chai Latte', 'Tea', 'Spiced', 'Black tea with spices and milk'),
--   (gen_random_uuid(), 'Green Tea', 'Tea', 'Hot', 'Brewed green tea'),
--   (gen_random_uuid(), 'Hot Chocolate', 'Chocolate', 'Hot', 'Warm chocolate with milk');

-- 3. Update check_ins to reference new drink IDs
-- This is complex - you'll need to map old IDs to new ones
-- Recommend manually reviewing before doing this

-- ====================================================================
-- TROUBLESHOOTING
-- ====================================================================

-- Problem: get_top_drinks_for_cafe returns empty results
-- Diagnosis:
SELECT 
  'Total check_ins' as check_label, COUNT(*) as count FROM check_ins
UNION ALL
SELECT 
  'Check_ins with cafe_id' as check_label, COUNT(*) FROM check_ins WHERE cafe_id IS NOT NULL
UNION ALL
SELECT 
  'Check_ins with valid drink_id' as check_label, COUNT(*) FROM check_ins ci 
  WHERE ci.drink_id IN (SELECT id FROM drinks)
UNION ALL
SELECT 
  'Cafes with check_ins' as check_label, COUNT(DISTINCT cafe_id) FROM check_ins WHERE cafe_id IS NOT NULL;

-- Problem: Top Drinks shows "drink-1" instead of real names
-- Solution: Run STEP 4 above to update names

-- Problem: Check-ins don't show up in any cafe's Top Drinks
-- Diagnosis: Check if cafe_id is populated
SELECT DISTINCT 
  CASE WHEN cafe_id IS NULL THEN 'Missing cafe_id' ELSE 'Has cafe_id' END as status,
  COUNT(*) as count
FROM check_ins
GROUP BY cafe_id IS NULL;

-- ====================================================================
