-- Fix all products with inflated prices due to double USD→ZAR conversion
-- This identifies and fixes products where cost price is suspiciously high (over R500)
-- which indicates they were converted twice (original bug: frontend + backend both converted)

-- Step 1: Check which products are affected (costs over R500 are likely double-converted)
SELECT 
    id, 
    product_name,
    cj_pid,
    cj_cost_price as current_cost,
    ROUND(cj_cost_price / 18.90, 2) as corrected_cost,
    suggested_price as current_retail,
    ROUND(suggested_price / 18.90, 2) as corrected_retail,
    custom_price as current_custom,
    ROUND(custom_price / 18.90, 2) as corrected_custom
FROM curated_products 
WHERE cj_cost_price > 500
ORDER BY id;

-- Step 2: Fix the inflated prices by dividing by 18.90 (undo the double conversion)
UPDATE curated_products 
SET 
  cj_cost_price = ROUND(cj_cost_price / 18.90, 2),
  suggested_price = ROUND(suggested_price / 18.90, 2),
  custom_price = ROUND(custom_price / 18.90, 2),
  updated_at = NOW()
WHERE cj_cost_price > 500;

-- Step 3: Verify the fix
SELECT 
    id, 
    product_name,
    cj_pid,
    cj_cost_price as fixed_cost,
    suggested_price as fixed_retail,
    custom_price as fixed_custom
FROM curated_products 
WHERE id IN (51, 53)
ORDER BY id;

-- Expected results after fix:
-- #51: Cost ~R69.90, Retail ~R139.80
-- #53: Cost ~R41.14, Retail ~R82.28
