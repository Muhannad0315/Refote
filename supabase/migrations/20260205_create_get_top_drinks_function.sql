-- Create function to get top drinks for a place based on average rating
-- Requires minimum 1 check-in per drink (configurable)
-- Sorts by avg_rating DESC, then count DESC
-- Returns top N results
-- 
-- NOTE: Drinks are identified by drink_name (the text field in check_ins)
-- The drinks table is optional reference data only

CREATE OR REPLACE FUNCTION get_top_drinks_for_cafe(
  p_place_id UUID,
  min_check_ins INTEGER DEFAULT 1,
  max_results INTEGER DEFAULT 3
)
RETURNS TABLE (
  drink_id UUID,
  drink_name TEXT,
  avg_rating NUMERIC,
  check_in_count BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    ci.drink_id,
    ci.drink_name,
    ROUND(AVG(ci.rating)::numeric, 2) AS avg_rating,
    COUNT(*)::bigint AS check_in_count
  FROM check_ins ci
  WHERE ci.place_id = p_place_id
  GROUP BY ci.drink_id, ci.drink_name
  HAVING COUNT(*) >= min_check_ins
  ORDER BY AVG(ci.rating) DESC, COUNT(*) DESC
  LIMIT max_results;
$$;
