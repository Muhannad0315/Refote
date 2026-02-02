import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Allow token via CLI arg `--token=...` or SUPABASE_TOKEN env var
const cliTokenArg = process.argv.find((a) => a.startsWith("--token="));
const tokenFromArg = cliTokenArg ? cliTokenArg.split("=")[1] : undefined;
const token = tokenFromArg || process.env.SUPABASE_TOKEN;

if (!token) {
  console.error(
    "No token provided. Provide --token=<ACCESS_TOKEN> or set SUPABASE_TOKEN env var.",
  );
  process.exitCode = 2;
  process.exit();
}

// Import the supabase client after env is loaded so module-level constants pick up the vars.
const { createServerSupabaseClient } = await import("../supabaseClient");

async function main() {
  const supabase = createServerSupabaseClient(token);

  try {
    // Confirm token is valid and fetch the authenticated user's id
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      console.error("Failed to validate token:", userErr || "no user returned");
      process.exitCode = 2;
      return;
    }

    const userId = userData.user.id;

    // Fetch only the authenticated user's profile
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .limit(1);

    if (error) {
      console.error("Supabase error:", error);
      process.exitCode = 2;
      return;
    }

    console.log(JSON.stringify(data ?? [], null, 2));
  } catch (err) {
    console.error("Unexpected error:", err);
    process.exitCode = 1;
  }
}

main();
