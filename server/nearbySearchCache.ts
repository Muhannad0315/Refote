/**
 * In-memory cache for Nearby Search place IDs.
 *
 * Purpose:
 * - Protect Google Places API costs by caching nearby search results (place IDs)
 *   for a small geographic cell + radius so repeated requests from nearby
 *   locations can reuse cached place ID lists instead of issuing new API calls.
 * - This module MUST NOT call Google Places or fetch place details. It only
 *   stores and returns arrays of `placeId` strings. Fetching of place details
 *   (name, rating, photos) should happen elsewhere when needed.
 *
 * Stored entry shape:
 * {
 *   latCell: number,
 *   lngCell: number,
 *   radius: number,
 *   placeIds: string[],
 *   fetchedAt: number (ms timestamp)
 * }
 *
 * Expiry: cached results expire after 24 hours (to balance freshness and cost).
 */

type NearbySearchCacheEntry = {
  latCell: number;
  lngCell: number;
  radius: number;
  placeIds: string[];
  fetchedAt: number; // epoch ms
};

const CACHE = new Map<string, NearbySearchCacheEntry>();
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function makeKey(latCell: number, lngCell: number, radius: number) {
  return `${latCell}:${lngCell}:${radius}`;
}

/**
 * Retrieve cached place IDs for a given location cell and radius.
 *
 * Returns `string[]` (copy) when a fresh cache entry exists, or `null` when
 * no entry exists or the entry has expired. Callers should interpret `null`
 * as "no cached result" and proceed to call the Google Places API if needed.
 */
export function getCachedNearbySearch(
  latCell: number,
  lngCell: number,
  radius: number,
): string[] | null {
  const key = makeKey(latCell, lngCell, radius);
  const entry = CACHE.get(key);
  if (!entry) return null;

  // Expire entries older than 24 hours
  if (Date.now() - entry.fetchedAt > EXPIRY_MS) {
    CACHE.delete(key);
    return null;
  }

  // Return a shallow copy to avoid external mutation of internal array
  return entry.placeIds.slice();
}

/**
 * Store place IDs for a given location cell + radius. This function overwrites
 * any existing cache entry for the same key.
 *
 * Important: `placeIds` should be an array of Google Place ID strings only.
 * Do NOT store place details, photos, or other heavy objects here.
 */
export function setCachedNearbySearch(
  latCell: number,
  lngCell: number,
  radius: number,
  placeIds: string[],
): void {
  const key = makeKey(latCell, lngCell, radius);
  const entry: NearbySearchCacheEntry = {
    latCell,
    lngCell,
    radius,
    placeIds: placeIds.slice(), // store a copy
    fetchedAt: Date.now(),
  };
  CACHE.set(key, entry);
}

/**
 * For observability / testing only: clear the entire cache.
 * (Not exported as part of public API by default, but useful during development.)
 */
export function _clearNearbySearchCache(): void {
  CACHE.clear();
}
