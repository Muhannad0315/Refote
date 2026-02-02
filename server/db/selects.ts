// Shared Supabase select column lists for cafes
export const CAFE_DISCOVER_SELECT = [
  "id",
  "google_place_id",
  "name_en",
  "name_ar",
  "lat",
  "lng",
  "photo_reference",
  "rating",
  "reviews",
] as const;

export const CAFE_DETAIL_SELECT = [
  ...CAFE_DISCOVER_SELECT,
  // Detail-only fields
  "address_en",
  "address_ar",
  "city_en",
  "city_ar",
  "phone_number",
  "website",
  "opening_hours",
  "types",
  "price_level",
  "last_fetched_at",
  "rating",
  "reviews",
] as const;

export type CafeDiscoverSelect = (typeof CAFE_DISCOVER_SELECT)[number];
export type CafeDetailSelect = (typeof CAFE_DETAIL_SELECT)[number];
