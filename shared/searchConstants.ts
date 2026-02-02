// Shared default for search radius used by client and server.
// This file intentionally does not read environment variables so it can
// be safely imported in the browser bundle.
export const DEFAULT_SEARCH_RADIUS_METERS = 100; // 1 km
export const SHARED_SEARCH_RADIUS_NAME = "shared:DEFAULT_SEARCH_RADIUS_METERS";
