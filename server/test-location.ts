import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, "temp_location.json");

type Loc = { lat: number; lng: number };

let current: Loc | undefined;

function load() {
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number"
    ) {
      current = { lat: parsed.lat, lng: parsed.lng };
      // console.log(`[test-location] loaded ${current.lat}, ${current.lng}`);
      return;
    }
    throw new Error("temp_location.json missing numeric lat/lng");
  } catch (err: any) {
    throw new Error(
      `Failed to load server/temp_location.json — create the file with { lat:number, lng:number }: ${
        err.message || err
      }`,
    );
  }
}

// Initial (synchronous) load — fail fast if file missing or invalid
load();

// Watch for changes and reload (debounced). On reload failure, log error but keep previous value.
try {
  let timer: NodeJS.Timeout | null = null;
  fs.watch(FILE, { persistent: false }, (event) => {
    if (event === "change" || event === "rename") {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          load();
        } catch (e: any) {
          console.error("[test-location] reload failed:", e.message || e);
        }
        timer = null;
      }, 150);
    }
  });
} catch (err) {
  // ignore watch errors on platforms that may not support it
}

export function getTestLocation(): Loc {
  if (!current) {
    throw new Error(
      "Test location not loaded — create server/temp_location.json with { lat:number, lng:number }",
    );
  }
  return current;
}
