const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");
if (!fs.existsSync(envPath)) {
  console.error("server/.env not found");
  process.exit(1);
}
const env = fs.readFileSync(envPath, "utf8");
const m = env.match(/GOOGLE_API_KEY\s*=\s*['\"]?([^'\"\r\n]+)/);
if (!m) {
  console.error("GOOGLE_API_KEY not found in server/.env");
  process.exit(1);
}
const apiKey = m[1].trim();

(async () => {
  try {
    const url = `https://places.googleapis.com/v1/places:searchText?key=${encodeURIComponent(
      apiKey,
    )}`;
    // Try snake_case keys which the API surface may expect
    const m2 = env.match(/SEARCH_RADIUS_METERS\s*=\s*['"]?([^'"\r\n]+)/);
    const radius = m2 ? Number(m2[1].trim()) || 1000 : 1000;
    const body = {
      query: "cafes",
      location_bias: {
        point: { lat: 24.43596817310561, lng: 39.511728434908854 },
        radius_meters: radius,
      },
      included_type: "CAFE",
      page_size: 10,
    };
    // console.log(`[places] run_places_test.cjs: radius=${radius}`);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-User-Language": "en",
        "X-Goog-FieldMask":
          "places.displayName,places.location,places.businessStatus,places.photos,places.rating,places.reviews",
      },
      body: JSON.stringify(body),
      timeout: 30000,
    });

    const text = await res.text();
    // console.log(text);
  } catch (err) {
    console.error("Request failed:", err && err.message ? err.message : err);
    process.exit(2);
  }
})();
