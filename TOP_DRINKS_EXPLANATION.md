# Top Drinks - Why It's Not Working & How to Fix It

## The Problem (In Plain English)

Your drinks table currently has:

```
id        | name       | type
----------|------------|---------------
drink-1   | drink-1    | Espresso-based
drink-2   | drink-2    | Tea
drink-3   | drink-3    | Espresso-based
```

This is the issue. The "name" column has placeholder values. When Top Drinks shows up in the UI, it displays "drink-1", "drink-2" because that's what's in the database.

**What it SHOULD look like:**

```
id        | name          | type
----------|---------------|---------------
uuid-xxx  | Latte         | Espresso-based
uuid-yyy  | Cappuccino    | Espresso-based
uuid-zzz  | Chai Latte    | Tea
```

---

## How the Drinks Table Works

### Purpose

The drinks table is a **catalog of beverage types** that people can check in at cafes.

### Schema (What Fields Exist)

```
drinks:
- id (UUID): Unique identifier
- name (TEXT): The actual drink name like "Latte", "Cappuccino"
- type (TEXT): Category like "Espresso-based", "Tea", "Cold"
- style (TEXT): Optional detail like "Milky", "Single Shot"
- description (TEXT): Optional longer description
```

### Relationship to Check-ins

```
When someone checks in at a cafe, they:
1. Choose the cafe
2. Choose the drink (must exist in drinks table)
3. Rate it (1-5 stars)

This creates a record in the check_ins table with:
- cafe_id (which cafe)
- drink_id (references drinks.id)
- rating (their rating)
```

### Key Rule

**Every check-in MUST reference a drink in the drinks table**

If you have a check-in with `drink_id = "drink-1"`, then the drinks table MUST have a row with `id = "drink-1"` and a real `name` value.

---

## Why Top Drinks Shows Placeholder Names

The current flow is:

1. User checks in: "I had Latte at this cafe, rating 5 stars"

   - Creates check_in with: `cafe_id=X, drink_id='drink-1', rating=5`

2. UI requests Top Drinks for that cafe

   - Backend queries: `get_top_drinks_for_cafe(cafe_id=X)`

3. SQL function runs:

```sql
SELECT
  ci.drink_id,
  d.name AS drink_name,      ← Gets the name from drinks table
  AVG(ci.rating) AS avg_rating,
  COUNT(*) AS check_in_count
FROM check_ins ci
INNER JOIN drinks d ON d.id = ci.drink_id
WHERE ci.cafe_id = X
GROUP BY ci.drink_id, d.name
```

4. If drinks table has: `id='drink-1', name='drink-1'`

   - Result shows: `drink_name='drink-1'` (the placeholder)

5. UI displays: "Top Drinks: drink-1, drink-2, drink-3"
   - ❌ Wrong! Should be: "Top Drinks: Latte, Cappuccino, Espresso"

---

## The Fix (Step-by-Step)

### Option A: Fix Existing Drinks (Quick Fix)

If your drinks table already has check-ins referencing the placeholder IDs, update the names:

```sql
UPDATE drinks SET name = 'Latte', type = 'Espresso-based' WHERE id = 'drink-1';
UPDATE drinks SET name = 'Cappuccino', type = 'Espresso-based' WHERE id = 'drink-2';
UPDATE drinks SET name = 'Espresso', type = 'Espresso-based' WHERE id = 'drink-3';
UPDATE drinks SET name = 'Black Coffee', type = 'Filter' WHERE id = 'drink-4';
```

Then refresh the UI and Top Drinks will show real names.

### Option B: Start Fresh (Complete Fix)

1. Insert proper drinks with real UUIDs:

```sql
INSERT INTO drinks (id, name, type, style) VALUES
  (gen_random_uuid(), 'Latte', 'Espresso-based', 'Milky'),
  (gen_random_uuid(), 'Cappuccino', 'Espresso-based', 'Balanced'),
  (gen_random_uuid(), 'Espresso', 'Espresso-based', 'Single Shot'),
  (gen_random_uuid(), 'Americano', 'Espresso-based', 'Long'),
  (gen_random_uuid(), 'Cold Brew', 'Filter', 'Chilled'),
  (gen_random_uuid(), 'Chai Latte', 'Tea', 'Spiced');
```

2. Update existing check-ins to reference new drink IDs
   - This is complex, requires mapping old→new IDs

---

## Data Flow Diagram

```
CREATE CHECK-IN:
User → "I had Latte at Cafe X, 5 stars" → check_ins table
  {
    user_id: uuid-user,
    cafe_id: uuid-cafe,
    drink_id: uuid-drink,  ← Must exist in drinks table!
    rating: 5
  }

QUERY TOP DRINKS:
UI → Server → SQL Function → Join check_ins + drinks

  Pseudo-code:
  SELECT avg(ratings) per drink
  WHERE cafe_id = X
  JOIN drinks to get names
  ORDER BY avg_rating DESC
  LIMIT 3

DISPLAY TOP DRINKS:
UI renders with:
  - Real drink names (from drinks.name)
  - Average rating
  - Number of ratings
  - Medal emoji
```

---

## Checklist: Getting Top Drinks to Work

- [ ] drinks table has entries with real names (not "drink-1")
- [ ] drinks table is not empty
- [ ] check_ins reference valid drink IDs
- [ ] check_ins have cafe_id populated (not NULL)
- [ ] At least 1 cafe has 1+ check_ins
- [ ] SQL function `get_top_drinks_for_cafe` exists
- [ ] Backend is calling the function with correct cafe_id
- [ ] Frontend is receiving topDrinks array from API

---

## Files Provided

I created three SQL files to help you:

1. **sql_diagnostics_and_fixes.sql**

   - Comprehensive diagnostic queries
   - Explains the data model
   - Shows how to find issues
   - Includes full setup examples

2. **QUICK_START_TOP_DRINKS.sql**

   - Step-by-step queries to run
   - Start with this file
   - Easy to follow in order
   - Includes troubleshooting

3. **TOP_DRINKS_SETUP_GUIDE.md**
   - Explanation document
   - How everything works
   - Why Top Drinks might fail
   - Data flow diagram

---

## Next Steps

1. Run the QUICK_START_TOP_DRINKS.sql queries in Supabase SQL editor
2. Follow the steps in order (1-7)
3. Fix the drink names using Step 4
4. Test the function in Step 7
5. Reload the UI and check Top Drinks section

If Top Drinks still doesn't show after fixing the drink names, run the diagnostics from sql_diagnostics_and_fixes.sql to find the specific issue.

---

## Real Drink Names to Use

Instead of "drink-1", "drink-2", use these real names:

**Espresso-based:**

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

**Filter/Drip:**

- Black Coffee
- Cold Brew

**Cold:**

- Iced Latte
- Iced Cappuccino
- Iced Americano
- Iced Mocha

**Tea:**

- Green Tea
- Black Tea
- Chai Latte
- Matcha Latte

**Chocolate:**

- Hot Chocolate
- Iced Chocolate

Pick the real names that match what your users are actually checking in!
