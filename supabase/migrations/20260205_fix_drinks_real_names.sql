-- Migration: Update drinks table with real drink names
-- This fixes the issue where Top Drinks shows "drink-1", "drink-2"
-- 
-- HOW TO USE:
-- 1. Copy these queries
-- 2. Paste into Supabase SQL Editor
-- 3. Run them in order
-- 4. Test Top Drinks in UI

-- FIRST: Check what you currently have
SELECT id, name FROM drinks ORDER BY id;

-- If drinks has IDs like 'drink-1', 'drink-2', run the updates below:

-- Update existing drinks with real names
UPDATE drinks SET 
  name = 'Espresso',
  type = 'Espresso-based',
  style = 'Single Shot'
WHERE id = 'drink-1';

UPDATE drinks SET 
  name = 'Latte',
  type = 'Espresso-based',
  style = 'Milky'
WHERE id = 'drink-2';

UPDATE drinks SET 
  name = 'Cappuccino',
  type = 'Espresso-based',
  style = 'Balanced'
WHERE id = 'drink-3';

UPDATE drinks SET 
  name = 'Americano',
  type = 'Espresso-based',
  style = 'Long'
WHERE id = 'drink-4';

UPDATE drinks SET 
  name = 'Black Coffee',
  type = 'Filter',
  style = 'Hot'
WHERE id = 'drink-5';

UPDATE drinks SET 
  name = 'Cold Brew',
  type = 'Filter',
  style = 'Chilled'
WHERE id = 'drink-6';

UPDATE drinks SET 
  name = 'Chai Latte',
  type = 'Tea',
  style = 'Spiced'
WHERE id = 'drink-7';

UPDATE drinks SET 
  name = 'Green Tea',
  type = 'Tea',
  style = 'Hot'
WHERE id = 'drink-8';

UPDATE drinks SET 
  name = 'Iced Latte',
  type = 'Cold',
  style = 'Iced'
WHERE id = 'drink-9';

UPDATE drinks SET 
  name = 'Hot Chocolate',
  type = 'Chocolate',
  style = 'Hot'
WHERE id = 'drink-10';

-- THEN: Verify the updates worked
SELECT id, name, type FROM drinks ORDER BY name;

-- THEN: Find a cafe with check-ins and test
SELECT 
  cf.id as cafe_id,
  cf.name_en,
  COUNT(ci.id) as check_in_count
FROM coffee_places cf
LEFT JOIN check_ins ci ON ci.cafe_id = cf.id
WHERE ci.id IS NOT NULL
GROUP BY cf.id, cf.name_en
ORDER BY check_in_count DESC
LIMIT 5;

-- FINALLY: Test the Top Drinks function
-- Replace 'CAFE_ID_FROM_ABOVE' with actual cafe ID
SELECT 
  drink_id,
  drink_name,
  avg_rating,
  check_in_count
FROM get_top_drinks_for_cafe('CAFE_ID_FROM_ABOVE', 1, 3)
ORDER BY avg_rating DESC;

-- Expected output with real drink names like:
-- drink_id    | drink_name  | avg_rating | check_in_count
-- ------------|-------------|------------|----------------
-- uuid-1      | Latte       | 4.7        | 3
-- uuid-2      | Cappuccino  | 4.5        | 2
