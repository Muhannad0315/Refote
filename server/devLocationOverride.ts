/**
 * Dev Location Override
 *
 * Allows developers to override lat/lng for testing Discover in different locations.
 * Server-side only. Zero UI exposure.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface LocationOverride {
  enabled: boolean;
  lat?: number;
  lng?: number;
}

const OVERRIDE_FILE = path.join(__dirname, "temp_location.json");

/**
 * Load location override from temp_location.json
 */
export function loadLocationOverride(): LocationOverride | null {
  try {
    if (!fs.existsSync(OVERRIDE_FILE)) {
      return null;
    }

    const content = fs.readFileSync(OVERRIDE_FILE, "utf-8");
    const data = JSON.parse(content);

    if (!data.enabled) {
      return null;
    }

    if (typeof data.lat !== "number" || typeof data.lng !== "number") {
      console.warn(
        "[devLocationOverride] Invalid lat/lng in temp_location.json",
      );
      return null;
    }

    return {
      enabled: true,
      lat: data.lat,
      lng: data.lng,
    };
  } catch (error) {
    console.warn(
      "[devLocationOverride] Failed to load temp_location.json:",
      error,
    );
    return null;
  }
}

/**
 * Apply location override if enabled
 * Returns effective lat/lng and whether override was applied
 */
export function applyLocationOverride(
  requestLat: number | undefined,
  requestLng: number | undefined,
  requestId: string,
): { lat: number | undefined; lng: number | undefined; overridden: boolean } {
  const override = loadLocationOverride();

  if (!override) {
    return {
      lat: requestLat,
      lng: requestLng,
      overridden: false,
    };
  }

  // Only log when an override is ACTIVE
  try {
    console.log(
      `[devLocationOverride][${requestId}] ACTIVE: overriding (${
        requestLat ?? "<none>"
      }, ${requestLng ?? "<none>"}) → (${override.lat}, ${override.lng})`,
    );
  } catch (_) {}

  return {
    lat: override.lat ?? undefined,
    lng: override.lng ?? undefined,
    overridden: true,
  };
}
