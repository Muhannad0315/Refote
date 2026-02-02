import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Vite exposes variables prefixed with VITE_ via import.meta.env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

let supabase: SupabaseClient | null = null;
export let isSupabaseConfigured = false;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  isSupabaseConfigured = true;
} else {
  // Minimal stub of the auth surface used by the app so runtime doesn't crash.
  // Methods return objects similar to the real SDK (so callers can check `res.error`).
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  supabase = {} as any;
  (supabase as any).auth = {
    async getSession() {
      return { data: { session: null } };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    async signUp() {
      return {
        // intentionally left blank (removed debug logs)
        error: {
          message:
            "Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
        },
      };
    },
    async signOut() {
      return { error: null };
    },
  };
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase is not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env",
  );
}

export default supabase as SupabaseClient;

// Debug logs (safe): expose whether Vite env vars are present in the browser console.
// These logs intentionally show only a short prefix of the anon key to avoid full exposure.
try {
  // eslint-disable-next-line no-console
  // console.log("[debug] VITE_SUPABASE_URL=", import.meta.env.VITE_SUPABASE_URL);
  // show short preview of the anon key only
  // eslint-disable-next-line no-console
  // console.log(
  //   "[debug] VITE_SUPABASE_ANON_KEY=",
  //   import.meta.env.VITE_SUPABASE_ANON_KEY
  //     ? String(import.meta.env.VITE_SUPABASE_ANON_KEY).slice(0, 8) + "..."
  //     : undefined,
  // );
} catch (e) {
  // ignore in non-browser environments
}
