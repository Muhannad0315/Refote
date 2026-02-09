// get_token.js

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// load server/.env by default
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// accept CLI args --email= and --password= (do NOT fall back to env dev users)
const arg = (name) => {
  const a = process.argv.find((s) => s.startsWith(`--${name}=`));
  return a ? a.split("=")[1] : undefined;
};

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const email = arg("email");
const password = arg("password");

if (!supabaseUrl || !anonKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment (server/.env)",
  );
  process.exitCode = 1;
  process.exit();
}

if (!email || !password) {
  console.error(
    "Please provide credentials via --email=... --password=... (no DEV_TEST fallbacks allowed)",
  );
  process.exitCode = 1;
  process.exit();
}

const supabase = createClient(supabaseUrl, anonKey);
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
if (error) {
  console.error("Sign-in error:", error);
  process.exitCode = 2;
  process.exit();
}
console.log(data?.session?.access_token ?? "");
