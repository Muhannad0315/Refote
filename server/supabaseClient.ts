import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "Server Supabase client not fully configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in server/.env",
  );
}

export function createServerSupabaseClient(token?: string): SupabaseClient {
  // If a user token is provided, include it in the Authorization header so
  // Supabase treats the request as coming from that user (RLS applies).
  const global: any = {};
  if (token) {
    global.headers = { Authorization: `Bearer ${token}` };
  }

  return createClient(SUPABASE_URL as string, SUPABASE_SERVICE_KEY as string, {
    global,
    auth: { persistSession: false },
  });
}
