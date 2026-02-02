import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// Load server/.env if present
try {
  const envPath = new URL("../server/.env", import.meta.url);
  if (fs.existsSync(envPath)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = await import("dotenv");
    dotenv.config({ path: envPath.pathname });
  }
} catch (e) {
  // ignore
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY environment variables. Ensure server/.env is present.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  try {
    const { data, error } = await supabase
      .from("coffee_places")
      .select("id, google_place_id, rating, reviews, photo_reference, lat, lng")
      .limit(200);
    if (error) {
      console.error("Supabase query error:", error);
      process.exit(1);
    }
    console.log(JSON.stringify(data || [], null, 2));
  } catch (err) {
    console.error("Unexpected error:", err);
    process.exit(1);
  }
}

run();
