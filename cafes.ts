export interface Cafe {
  placeId: string; // resource name like "places/XXXX"
  name: string | null;
  latitude: number | null;
  longitude: number | null;
  photoResource?: string | null;
  raw?: any;
  rating?: number | null;
  reviews?: number | null;
}

/**
 * Server-side helper to query Places SearchText for cafes near a point.
 * Caller must provide `apiKey` (keep keys server-side).
 */
import {
  SEARCH_RADIUS_METERS,
  SEARCH_RADIUS_SOURCE,
} from "./server/searchConstants";

export async function getCafesAtLocation(
  apiKey: string,
  lat: number,
  lng: number,
  language = "en",
): Promise<Cafe[]> {
  if (!apiKey) {
    throw new Error("MissingApiKey");
  }
  // Use the classic Maps Places Nearby Search endpoint which returns a stable
  // JSON schema (works reliably with an API key). This avoids the newer
  // `places:searchText` payload shape errors we've seen.
  const radius = SEARCH_RADIUS_METERS;
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=cafe&language=${encodeURIComponent(
    language,
  )}&key=${encodeURIComponent(apiKey)}`;
  // Build a sanitized URL for logging (remove API key)
  let sanitizedUrl = url;
  try {
    const u = new URL(url);
    u.searchParams.delete("key");
    sanitizedUrl = u.toString();
  } catch (_) {
    /* ignore */
  }

  try {
    console.log(
      `[places] NearbySearch request url=${sanitizedUrl} radius=${radius} lat=${lat} lng=${lng} language=${language}`,
    );
  } catch (_) {}
  // console.log(
  //   `[places] Nearby Search: radius=${radius} (${SEARCH_RADIUS_SOURCE}) url=${url}`,
  // );

  // Use the rate-limited fetch so we don't exceed Google usage quotas. The
  // limiter returns `null` when the soft limit is reached; callers should
  // handle that case (e.g., serve cached results instead of calling Google).
  const { attemptFetch } = await import("./server/googleRateLimiter");
  const res = await attemptFetch(url, { method: "GET" }, "Nearby");
  if (!res) {
    // indicate to the caller that Google calls are temporarily rate-limited
    throw new Error("RateLimitExceeded");
  }
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Nearby Search ${res.status}: ${text}`);
  }
  const data = JSON.parse(text);
  try {
    console.log(
      `[places] NearbySearch response status=${
        data?.status ?? "(no status)"
      } for url=${sanitizedUrl}`,
    );
  } catch (_) {}
  // Handle transient Google-side UNKNOWN_ERROR gracefully — treat as a
  // soft failure and return an empty result set rather than aborting the
  // entire Discover flow. Only REQUEST_DENIED is a hard error from Google.
  try {
    const status = data?.status;
    if (status === "UNKNOWN_ERROR") {
      console.warn(
        "getCafesAtLocation: Google Nearby Search UNKNOWN_ERROR — returning empty results",
        { url: sanitizedUrl },
      );
      return [];
    }
    if (status === "REQUEST_DENIED") {
      const msg = data?.error_message || "REQUEST_DENIED";
      throw new Error(`REQUEST_DENIED: ${msg}`);
    }
  } catch (e) {
    // If JSON shape is unexpected keep going — fallback to results array below
  }
  const places = data.results || [];

  // Map initial results
  const mapped = places.map((p: any) => ({
    placeId: p.place_id ?? null,
    name: p.name ?? null,
    latitude: p.geometry?.location?.lat ?? null,
    longitude: p.geometry?.location?.lng ?? null,
    // Keep the original photo_reference so server can construct a proxied URL
    photoResource: p.photos?.[0]?.photo_reference ?? null,
    raw: p,
    rating: typeof p.rating === "number" ? p.rating : null,
    reviews:
      typeof p.user_ratings_total === "number" ? p.user_ratings_total : null,
  }));

  // If the client requested Arabic (or other localized language) and some
  // places are missing a localized `name`, fetch Place Details without a
  // language parameter to get the API default (typically English) and use
  // it as a fallback. This prevents empty names in the UI when localization
  // isn't available.
  if (language && language.startsWith("ar")) {
    // Removed Place Details fallbacks here to avoid external API calls.
    // Keep the Nearby Search `mapped` results unchanged.
  }

  // Strictly filter results to Saudi Arabia only. Some Places results include
  // `vicinity` or `plus_code.compound_code` containing the country name;
  // enforce that here so the app only works inside Saudi Arabia.
  const saFiltered = mapped.filter((m: any) => {
    const raw = m.raw || {};
    const vicinity = (raw.vicinity || raw.formatted_address || "").toString();
    const plus = raw.plus_code
      ? (
          raw.plus_code.compound_code ||
          raw.plus_code.global_code ||
          ""
        ).toString()
      : "";
    const combined = `${vicinity} ${plus}`;
    const englishMatch = combined.toLowerCase().includes("saudi arabia");
    const arabicMatch = combined.includes("السعودية");
    return englishMatch || arabicMatch;
  });

  if (saFiltered.length === 0) {
    // Signal to caller that the location is outside Saudi Arabia
    throw new Error("Service only available in Saudi Arabia");
  }

  return saFiltered;
}
