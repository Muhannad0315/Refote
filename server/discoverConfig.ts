/**
 * Discover Country Configuration
 *
 * Controls country filtering for Discover feature.
 * Server-side only. Client has no control.
 */

export type DiscoverCountryMode = "global" | "single" | "multi";

export interface DiscoverConfig {
  mode: DiscoverCountryMode;
  allowedCountries: string[]; // ISO-2 codes (e.g., ["SA", "UK"])
}

/**
 * Load configuration from environment variables
 */
export function loadDiscoverConfig(): DiscoverConfig {
  const mode = (process.env.DISCOVER_COUNTRY_MODE ||
    "single") as DiscoverCountryMode;
  const allowedCountriesEnv = process.env.DISCOVER_ALLOWED_COUNTRIES || "SA";

  const allowedCountries = allowedCountriesEnv
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  return {
    mode,
    allowedCountries: mode === "global" ? [] : allowedCountries,
  };
}

/**
 * Country name to ISO-2 code mapping
 * Supports both English and Arabic names
 */
const COUNTRY_MAP: Record<string, string> = {
  // Saudi Arabia
  "saudi arabia": "SA",
  السعودية: "SA",
  "kingdom of saudi arabia": "SA",
  "المملكة العربية السعودية": "SA",

  // United Arab Emirates
  "united arab emirates": "AE",
  uae: "AE",
  الإمارات: "AE",
  "الإمارات العربية المتحدة": "AE",

  // Egypt
  egypt: "EG",
  مصر: "EG",

  // United Kingdom
  "united kingdom": "UK",
  uk: "UK",
  england: "UK",
  britain: "UK",

  // United States
  "united states": "US",
  usa: "US",
  us: "US",
  "united states of america": "US",

  // Add more countries as needed
};

/**
 * Extract country from Google Place data
 * Priority: plus_code.compound_code > vicinity > formatted_address
 */
export function detectCountryFromPlace(place: any): string | null {
  const sources = [
    place.plus_code?.compound_code,
    place.plus_code?.global_code,
    place.vicinity,
    place.formatted_address,
  ];

  for (const source of sources) {
    if (!source) continue;

    const text = source.toString().toLowerCase();

    // Try to match against known countries
    for (const [name, code] of Object.entries(COUNTRY_MAP)) {
      if (text.includes(name.toLowerCase())) {
        return code;
      }
    }
  }

  return null;
}

/**
 * Normalize country name/code to ISO-2
 */
export function normalizeCountry(country: string): string {
  const normalized = country.toLowerCase().trim();
  return COUNTRY_MAP[normalized] || country.toUpperCase();
}

/**
 * Check if a country is allowed based on current config
 */
export function isCountryAllowed(
  country: string | null,
  config: DiscoverConfig,
): boolean {
  if (config.mode === "global") {
    return true;
  }

  if (!country) {
    return false; // Unknown countries are rejected in restricted modes
  }

  const normalizedCountry = normalizeCountry(country);
  return config.allowedCountries.includes(normalizedCountry);
}

/**
 * Log configuration for observability
 */
export function logDiscoverConfig(config: DiscoverConfig, requestId: string) {
  const allowedStr =
    config.mode === "global" ? "ALL" : config.allowedCountries.join(",");

  console.log(
    `[discover][${requestId}] countryMode=${config.mode} allowedCountries=${allowedStr}`,
  );
}
