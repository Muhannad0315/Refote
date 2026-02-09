-- ====================================================================
-- TOP DRINKS DATA MODEL EXPLANATION & DIAGNOSTIC QUERIES
-- ====================================================================

-- TABLE STRUCTURE:
-- 1. drinks table: 
--    - id: UUID (primary key)
--    - name: TEXT (actual drink name like "Latte", "Cappuccino")
--    - type: TEXT (e.g., "Espresso-based", "Tea")
--    - style: TEXT (optional, e.g., "Single Shot", "Double Shot")
--
-- 2. check_ins table:
--    - id: UUID (primary key)
--    - user_id: UUID (who made the check-in)
--    - drink_id: UUID (REQUIRED, NOT NULL - must reference drinks.id)
--    - cafe_id: UUID (which cafe)
--    - rating: REAL (1-5 rating for the drink)
--    - created_at: TIMESTAMP
--
-- 3. Relationship:
--    check_ins.drink_id → drinks.id (foreign key)
--    This means every check-in MUST reference a drink in the drinks table

-- ====================================================================
-- DIAGNOSTIC: Find the current problem
-- ====================================================================

-- 1. See all drinks in the drinks table
SELECT id, name, type, style 
FROM drinks 
ORDER BY name;

-- 2. Count check-ins that reference each drink
SELECT 
  d.id,
  d.name,
  COUNT(ci.id) as check_in_count
FROM drinks d
LEFT JOIN check_ins ci ON ci.drink_id = d.id
GROUP BY d.id, d.name
ORDER BY check_in_count DESC;

-- 3. Find orphaned check-ins (referencing non-existent drinks)
SELECT ci.id, ci.drink_id, ci.cafe_id, ci.rating, ci.created_at
FROM check_ins ci
LEFT JOIN drinks d ON d.id = ci.drink_id
WHERE d.id IS NULL
LIMIT 10;

-- 4. Find check-ins with NULL cafe_id (won't appear in cafe's Top Drinks)
SELECT ci.id, ci.drink_id, ci.cafe_id, ci.rating
FROM check_ins ci
WHERE ci.cafe_id IS NULL
LIMIT 10;

-- 5. Check the get_top_drinks_for_cafe function result for a specific cafe
-- (Replace 'cafe-uuid-here' with actual cafe ID from coffee_places table)
SELECT * FROM get_top_drinks_for_cafe('cafe-uuid-here', 1, 3);

-- ====================================================================
-- ISSUE: Drinks table has placeholder IDs like "drink-1", "drink-2"
-- ====================================================================
-- 
-- If your drinks table looks like:
--   id              | name       | type
--   drink-1         | drink-1    | Espresso-based
--   drink-2         | drink-2    | Tea
--   drink-3         | drink-3    | Espresso-based
--
-- This is the PROBLEM. The IDs should be UUIDs, not "drink-1" strings.
--

-- ====================================================================
-- SOLUTION: Proper drinks table setup
-- ====================================================================

-- Step 1: Create the correct drinks with UUID ids
-- First, check if drinks table is empty or has bad data
SELECT COUNT(*) FROM drinks;

-- Option A: If drinks table is empty, insert correct drinks
INSERT INTO drinks (id, name, type, style, description) VALUES
  (gen_random_uuid(), 'Espresso', 'Espresso-based', 'Single Shot', 'Strong, concentrated coffee shot'),
  (gen_random_uuid(), 'Americano', 'Espresso-based', 'Long Black', 'Espresso diluted with hot water'),
  (gen_random_uuid(), 'Latte', 'Espresso-based', 'Milky', 'Espresso with steamed milk and foam'),
  (gen_random_uuid(), 'Cappuccino', 'Espresso-based', 'Balanced', 'Equal parts espresso, steamed milk, and foam'),
  (gen_random_uuid(), 'Macchiato', 'Espresso-based', 'Marked', 'Espresso "marked" with a small amount of milk'),
  (gen_random_uuid(), 'Cortado', 'Espresso-based', 'Balanced', 'Equal parts espresso and warm milk'),
  (gen_random_uuid(), 'Flat White', 'Espresso-based', 'Creamy', 'Espresso with velvety steamed milk'),
  (gen_random_uuid(), 'Mocha', 'Espresso-based', 'Chocolatey', 'Espresso with steamed milk and chocolate'),
  (gen_random_uuid(), 'Ristretto', 'Espresso-based', 'Short', 'Shorter, more concentrated espresso'),
  (gen_random_uuid(), 'Lungo', 'Espresso-based', 'Long', 'Longer espresso with more water'),
  (gen_random_uuid(), 'Affogato', 'Espresso-based', 'Dessert', 'Espresso poured over ice cream'),
  (gen_random_uuid(), 'Black Coffee', 'Filter', 'Classic', 'Drip or filter coffee, no milk'),
  (gen_random_uuid(), 'Cold Brew', 'Filter', 'Chilled', 'Coffee steeped in cold water overnight'),
  (gen_random_uuid(), 'Iced Latte', 'Cold', 'Iced', 'Latte served over ice'),
  (gen_random_uuid(), 'Iced Cappuccino', 'Cold', 'Iced', 'Cappuccino served over ice'),
  (gen_random_uuid(), 'Iced Mocha', 'Cold', 'Iced', 'Mocha served over ice'),
  (gen_random_uuid(), 'Iced Coffee', 'Cold', 'Iced', 'Cold coffee served over ice'),
  (gen_random_uuid(), 'Iced Americano', 'Cold', 'Iced', 'Americano served over ice'),
  (gen_random_uuid(), 'Green Tea', 'Tea', 'Hot', 'Brewed green tea'),
  (gen_random_uuid(), 'Black Tea', 'Tea', 'Hot', 'Brewed black tea'),
  (gen_random_uuid(), 'Chai Latte', 'Tea', 'Spiced', 'Black tea with spices and milk'),
  (gen_random_uuid(), 'Matcha Latte', 'Tea', 'Green', 'Matcha powder whisked with steamed milk'),
  (gen_random_uuid(), 'Iced Tea', 'Tea', 'Iced', 'Cold brewed tea'),
  (gen_random_uuid(), 'Hot Chocolate', 'Chocolate', 'Hot', 'Warm chocolate with milk'),
  (gen_random_uuid(), 'Iced Chocolate', 'Chocolate', 'Iced', 'Chocolate served over ice');

-- Option B: If drinks table has data with bad IDs (like "drink-1")
-- You'll need to:
-- 1. Identify the mapping (what does "drink-1" actually represent?)
-- 2. Either fix the IDs or fix the check_ins references

-- ====================================================================
-- MIGRATION: Fix existing check-ins if drinks were created with wrong IDs
-- ====================================================================

-- If drinks table currently has:
--   id: "drink-1", "drink-2", etc. (strings, not UUIDs)
-- And check_ins references these:
--   This is actually OK as long as the IDs match
-- BUT the names should be real drink names, not "drink-1"

-- Fix drinks table names if they're just placeholders:
UPDATE drinks 
SET name = 'Latte'
WHERE id = 'drink-1';

UPDATE drinks 
SET name = 'Cappuccino'
WHERE id = 'drink-2';

UPDATE drinks 
SET name = 'Espresso'
WHERE id = 'drink-3';

-- (Add more as needed based on your actual drinks)

-- ====================================================================
-- VERIFY: Test the get_top_drinks_for_cafe function
-- ====================================================================

-- 1. First, find a cafe that has check-ins
SELECT cf.id, cf.name_en, COUNT(ci.id) as check_in_count
FROM coffee_places cf
LEFT JOIN check_ins ci ON ci.cafe_id = cf.id
GROUP BY cf.id, cf.name_en
HAVING COUNT(ci.id) > 0
ORDER BY check_in_count DESC
LIMIT 1;

-- 2. Then test the function with that cafe ID
-- Replace 'CAFE_ID_HERE' with the actual ID from query above
SELECT * FROM get_top_drinks_for_cafe('CAFE_ID_HERE', 1, 3);

-- Expected output:
-- drink_id    | drink_name        | avg_rating | check_in_count
-- uuid-123    | Latte             | 4.5        | 5
-- uuid-456    | Cappuccino        | 4.2        | 3
-- uuid-789    | Espresso          | 4.8        | 2

-- ====================================================================
-- COMMON ISSUES & FIXES
-- ====================================================================

-- Issue 1: get_top_drinks_for_cafe returns empty results
-- Causes:
--   a) No check_ins for that cafe
--   b) check_ins have NULL cafe_id
--   c) drinks table is missing entries referenced by check_ins
-- Fix: Run diagnostic queries above

-- Issue 2: Drinks names show as "drink-1", "drink-2"
-- Cause: drinks.name column has placeholder values
-- Fix: UPDATE drinks SET name = 'Real Drink Name' WHERE id = 'xxx';

-- Issue 3: check_ins reference drinks that don't exist
-- Cause: Orphaned references
-- Fix: Either create the drinks or delete/update the check_ins

-- ====================================================================
-- RECOMMENDED: Complete fresh setup
-- ====================================================================

-- 1. Backup current data (optional)
-- SELECT * FROM check_ins LIMIT 100; -- backup before changes

-- 2. Clear and rebuild (CAUTION: deletes data)
-- DELETE FROM drinks WHERE id NOT IN (SELECT DISTINCT drink_id FROM check_ins);

-- 3. Insert all standard drinks with proper UUIDs
-- (Use the INSERT statement from Option A above)

-- 4. Update any check_ins that reference old drink IDs
-- (You'll need to map old IDs to new UUIDs)

-- ====================================================================
