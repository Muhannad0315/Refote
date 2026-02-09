# Top Drinks - Complete Data Model & Setup Guide

## How the Drinks Table Works

### Schema

```
drinks table:
├── id (VARCHAR/UUID) - Primary key
├── name (TEXT) - The actual drink name (e.g., "Latte", "Cappuccino")
├── type (TEXT) - Category (e.g., "Espresso-based", "Tea", "Cold")
├── style (TEXT) - Optional subcategory (e.g., "Single Shot", "Milky")
└── description (TEXT) - Optional description
```

### Relationship to check_ins

```
check_ins table:
├── id
├── user_id
├── drink_id ← MUST reference drinks.id (NOT NULL, required)
├── cafe_id ← Links to coffee_places table
├── rating ← User's rating for this drink (1-5)
└── ...

When you create a check-in, you specify:
  - Which cafe (cafe_id)
  - Which drink (drink_id → must exist in drinks table)
  - Your rating for it
```

### Current Problem (Based on Your Description)

You said drinks table has IDs like "drink-1", "drink-3" with names "drink-1", "drink-3".

This is likely a data initialization issue where:

1. Someone created placeholder drinks with bad IDs and names
2. check_ins are referencing these placeholder IDs
3. The Top Drinks function tries to JOIN and gets these fake names

**Result:** Top Drinks shows "drink-1", "drink-2" instead of "Latte", "Cappuccino"

## What You Need to Do

### Step 1: Verify Current Data

Run these queries in Supabase SQL Editor:

```sql
-- See what drinks actually exist
SELECT id, name, type FROM drinks ORDER BY name;

-- See what each drink is referenced by how many check-ins
SELECT d.id, d.name, COUNT(ci.id) as check_in_count
FROM drinks d
LEFT JOIN check_ins ci ON ci.drink_id = d.id
GROUP BY d.id, d.name
ORDER BY check_in_count DESC;
```

### Step 2: Fix the Drinks Table

**If your drinks table is mostly empty:**

```sql
-- Option 1: Insert real drinks with UUIDs
INSERT INTO drinks (id, name, type, style, description) VALUES
  (gen_random_uuid(), 'Espresso', 'Espresso-based', 'Single Shot', 'Strong, concentrated coffee'),
  (gen_random_uuid(), 'Latte', 'Espresso-based', 'Milky', 'Espresso with steamed milk'),
  (gen_random_uuid(), 'Cappuccino', 'Espresso-based', 'Balanced', 'Equal parts espresso, milk, foam'),
  (gen_random_uuid(), 'Americano', 'Espresso-based', 'Long', 'Espresso diluted with water'),
  (gen_random_uuid(), 'Iced Latte', 'Cold', 'Iced', 'Latte served over ice'),
  (gen_random_uuid(), 'Cold Brew', 'Filter', 'Chilled', 'Cold steeped coffee'),
  (gen_random_uuid(), 'Chai Latte', 'Tea', 'Spiced', 'Black tea with spices');
```

**If your drinks table has placeholder names (like "drink-1"):**

```sql
-- Option 2: Fix existing drink names
UPDATE drinks SET name = 'Latte' WHERE id = 'drink-1';
UPDATE drinks SET name = 'Cappuccino' WHERE id = 'drink-2';
UPDATE drinks SET name = 'Espresso' WHERE id = 'drink-3';
-- ... etc
```

**If you have check_ins but they reference non-existent drinks:**

```sql
-- Option 3: Find and fix orphaned references
SELECT DISTINCT drink_id FROM check_ins
WHERE drink_id NOT IN (SELECT id FROM drinks);
-- Then either create those drinks or update the check_ins
```

### Step 3: Verify check_ins Have cafe_id

Top Drinks only shows drinks for cafes that have check_ins **with a cafe_id**.

```sql
-- Check if check_ins have cafe_id populated
SELECT COUNT(*) as total_check_ins,
       COUNT(CASE WHEN cafe_id IS NOT NULL THEN 1 END) as with_cafe_id,
       COUNT(CASE WHEN cafe_id IS NULL THEN 1 END) as missing_cafe_id
FROM check_ins;

-- If missing_cafe_id is high, you need to populate it:
UPDATE check_ins SET cafe_id = 'some-cafe-uuid' WHERE cafe_id IS NULL;
```

### Step 4: Test the Top Drinks Function

```sql
-- Find a cafe with check-ins
SELECT id, name_en FROM coffee_places
WHERE id IN (SELECT DISTINCT cafe_id FROM check_ins WHERE cafe_id IS NOT NULL)
LIMIT 1;

-- Test the function (replace CAFE_ID with the ID from above)
SELECT * FROM get_top_drinks_for_cafe('CAFE_ID', 1, 3);

-- Expected output:
-- drink_id | drink_name    | avg_rating | check_in_count
-- ---------|---------------|------------|----------------
-- uuid-1   | Latte         | 4.5        | 5
-- uuid-2   | Cappuccino    | 4.2        | 3
```

### Step 5: Verify Backend is Working

Check the logs when loading a cafe detail page:

```
[cafe-detail] placeId=xxx topDrinksCount=N
```

If topDrinksCount=0, either:

1. Cafe has no check-ins
2. Check-ins don't have cafe_id populated
3. Drinks table is empty/missing names

## Why Top Drinks Might Not Show

### Checklist:

- [ ] Drinks table has entries with real names (not "drink-1")
- [ ] check_ins.drink_id references drinks.id (no orphaned records)
- [ ] check_ins.cafe_id is populated (not NULL)
- [ ] cafe_id matches a coffee_places.id
- [ ] At least 1 check-in per cafe exists
- [ ] Top Drinks query returns results (run diagnostic)

### Backend Debug:

The SQL function `get_top_drinks_for_cafe` currently requires:

```sql
INNER JOIN drinks d ON d.id = ci.drink_id
```

This means:

- If drink doesn't exist in drinks table → check-in is EXCLUDED
- If drink.name is "drink-1" → Top Drinks shows "drink-1"

## Complete Data Flow

```
User makes check-in:
  1. Select cafe (cafe_id)
  2. Select drink (drink_id)
  3. Give rating
  4. Save to check_ins table

Top Drinks aggregates:
  1. Query: GROUP check_ins BY drink_id WHERE cafe_id = X
  2. JOIN with drinks table to get drink names
  3. Calculate AVG(rating), COUNT(*)
  4. Filter: HAVING COUNT >= 1
  5. Sort: ORDER BY avg_rating DESC
  6. Return top 3

UI renders:
  1. Shows drink name (from drinks.name)
  2. Shows average rating
  3. Shows count of ratings
  4. Displays with medal emoji (🥇🥈🥉)
```

## IMPORTANT: drink_id IS REQUIRED

- Every check_in MUST have a drink_id
- The drink_id MUST reference a row in the drinks table
- The drinks table MUST have realistic drink names
- If any of these is missing → Top Drinks won't work

## Real Drink Names to Use

- Espresso
- Latte
- Cappuccino
- Americano
- Macchiato
- Cortado
- Flat White
- Mocha
- Ristretto
- Lungo
- Affogato
- Black Coffee
- Cold Brew
- Iced Latte
- Iced Cappuccino
- Iced Mocha
- Iced Coffee
- Iced Americano
- Green Tea
- Black Tea
- Chai Latte
- Matcha Latte
- Iced Tea
- Hot Chocolate
- Iced Chocolate

Use these instead of generic "drink-1" placeholders.
