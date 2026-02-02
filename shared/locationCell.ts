/**
 * Rounds geographic coordinates to a location "cell" used for grouping.
 *
 * We use 3 decimal places (≈ 110 meters latitude precision) to reduce
 * duplicate/nearby Google Places requests while keeping reasonable location
 * accuracy for city-level discovery. Rounding both latitude and longitude
 * to 3 decimals creates a simple grid cell key for caching or de-duping.
 *
 * This prevents duplicate Google API calls by mapping nearby coordinates
 * that fall within the same ~100m cell to a single canonical cell value.
 * When the server or client uses this cell as a cache key or a lookup
 * bucket, repeated requests from locations inside the same cell can reuse
 * cached results instead of issuing new Places API requests.
 */
export function getLocationCell(
  lat: number,
  lng: number,
): {
  latCell: number;
  lngCell: number;
} {
  // Helper: round to 3 decimal places
  const round3 = (n: number) => Math.round(n * 1000) / 1000;

  return {
    latCell: round3(lat),
    lngCell: round3(lng),
  };
}

// Example:
// getLocationCell(24.7136, 46.6753) -> { latCell: 24.714, lngCell: 46.675 }
