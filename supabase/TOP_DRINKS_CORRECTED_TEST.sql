-- ====================================================================
-- TOP DRINKS - CORRECTED TEST QUERIES
-- ====================================================================

-- STEP 1: Verify check_ins have drink_name
SELECT 
  COUNT(*) as total_check_ins,
  COUNT(CASE WHEN drink_name IS NOT NULL THEN 1 END) as with_drink_name,
  COUNT(CASE WHEN place_id IS NOT NULL THEN 1 END) as with_place_id
FROM check_ins;

-- STEP 2: See sample check_ins with drink names
SELECT id, place_id, drink_name, rating, created_at
FROM check_ins
WHERE drink_name IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- STEP 3: See all unique drink names in the database
SELECT DISTINCT drink_name, COUNT(*) as check_in_count
FROM check_ins
WHERE drink_name IS NOT NULL
GROUP BY drink_name
ORDER BY check_in_count DESC;

-- STEP 4: Find a coffee place with check-ins
SELECT 
  cp.id,
  cp.name_en,
  COUNT(ci.id) as check_in_count
FROM coffee_places cp
LEFT JOIN check_ins ci ON ci.place_id = cp.id
WHERE ci.id IS NOT NULL
GROUP BY cp.id, cp.name_en
ORDER BY check_in_count DESC
LIMIT 5;

-- STEP 5: Test the get_top_drinks_for_cafe function
-- Replace 'PLACE_UUID_HERE' with an actual place ID from STEP 4
SELECT 
  drink_id,
  drink_name,
  avg_rating,
  check_in_count
FROM get_top_drinks_for_cafe('PLACE_UUID_HERE'::uuid, 1, 3)
ORDER BY avg_rating DESC, check_in_count DESC;

-- Expected output with real drink names:
-- drink_id    | drink_name    | avg_rating | check_in_count
-- ------------|---------------|------------|----------------
-- uuid-1      | Latte         | 4.8        | 5
-- uuid-2      | Cappuccino    | 4.5        | 3
-- uuid-3      | Espresso      | 4.0        | 2

-- STEP 6: Advanced - See top drinks for all places
SELECT 
  cp.name_en,
  td.drink_name,
  td.avg_rating,
  td.check_in_count
FROM coffee_places cp
CROSS JOIN LATERAL get_top_drinks_for_cafe(cp.id, 1, 3) td
ORDER BY cp.name_en, td.avg_rating DESC;

-- STEP 7: Verify the function works without errors
-- This shows the function signature
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'get_top_drinks_for_cafe'
AND routine_schema = 'public';

-- Expected: Should show the function exists
-- routine_name                | routine_type
-- ----------------------------|---------------
-- get_top_drinks_for_cafe    | FUNCTION

-- ====================================================================
-- TROUBLESHOOTING
-- ====================================================================

-- If Step 5 returns empty:
-- Reason 1: Place has no check-ins
SELECT COUNT(*) FROM check_ins WHERE place_id = 'PLACE_UUID_HERE'::uuid;

-- Reason 2: Check-ins don't have drink_name
SELECT COUNT(*) FROM check_ins 
WHERE place_id = 'PLACE_UUID_HERE'::uuid AND drink_name IS NOT NULL;

-- Reason 3: Function doesn't exist or has syntax error
SELECT * FROM information_schema.routines 
WHERE routine_name = 'get_top_drinks_for_cafe';

-- ====================================================================
-- MANUAL TOP DRINKS QUERY (for comparison)
-- ====================================================================

-- This shows what the function returns, manually:
SELECT
  ci.drink_id,
  ci.drink_name,
  ROUND(AVG(ci.rating)::numeric, 2) AS avg_rating,
  COUNT(*)::bigint AS check_in_count
FROM check_ins ci
WHERE ci.place_id = 'PLACE_UUID_HERE'::uuid
GROUP BY ci.drink_id, ci.drink_name
HAVING COUNT(*) >= 1
ORDER BY AVG(ci.rating) DESC, COUNT(*) DESC
LIMIT 3;

-- This should match the output of:
-- SELECT * FROM get_top_drinks_for_cafe('PLACE_UUID_HERE'::uuid, 1, 3);

-- ====================================================================
