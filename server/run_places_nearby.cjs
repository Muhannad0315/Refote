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
    const lat = 24.43596817310561;
    const lng = 39.511728434908854;
    // read SEARCH_RADIUS_METERS from the same .env file (fallback to 1000)
    const m2 = env.match(/SEARCH_RADIUS_METERS\s*=\s*['"]?([^'"\r\n]+)/);
    const radius = m2 ? Number(m2[1].trim()) || 1000 : 1000;
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=cafe&key=${encodeURIComponent(
      apiKey,
    )}`;
    // console.log(`[places] run_places_nearby: radius=${radius} url=${url}`);

    const res = await fetch(url, { method: "GET", timeout: 30000 });
    const text = await res.text();
    // console.log(text);
  } catch (err) {
    console.error("Request failed:", err && err.message ? err.message : err);
    process.exit(2);
  }
})();
